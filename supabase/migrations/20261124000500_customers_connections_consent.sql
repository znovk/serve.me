-- =============================================================================
-- Migration: customer profiles, customer <-> professional connections, consent.
--
-- Customer data is never exposed automatically. A professional sees only the
-- customer's display name and the consent flags of an ACCEPTED connection.
-- All consent defaults to false and every change is recorded in
-- consent_history (append-only).
-- =============================================================================

create type public.visitor_type as enum ('local', 'visitor');
create type public.connection_status as enum ('pending', 'accepted', 'declined', 'blocked', 'disconnected');
create type public.consent_scope as enum (
  'direct_messages', 'shift_notifications', 'marketing', 'shared_preferences', 'loyalty'
);

create table public.customer_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  visitor_type public.visitor_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_updated_at();

create table public.customer_connections (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references public.profiles (id) on delete cascade,
  hospitality_profile_id uuid not null references public.hospitality_profiles (id) on delete cascade,
  status public.connection_status not null default 'pending',
  blocked_by text check (blocked_by is null or blocked_by in ('customer', 'professional')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_user_id, hospitality_profile_id)
);

create index customer_connections_profile_idx on public.customer_connections (hospitality_profile_id, status);
create index customer_connections_customer_idx on public.customer_connections (customer_user_id, status);

create trigger customer_connections_set_updated_at
  before update on public.customer_connections
  for each row execute function public.set_updated_at();

create table public.consent_preferences (
  connection_id uuid primary key references public.customer_connections (id) on delete cascade,
  direct_messages boolean not null default false,
  shift_notifications boolean not null default false,
  marketing boolean not null default false,
  shared_preferences boolean not null default false,
  loyalty boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger consent_preferences_set_updated_at
  before update on public.consent_preferences
  for each row execute function public.set_updated_at();

create table public.consent_history (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.customer_connections (id) on delete cascade,
  customer_user_id uuid not null references public.profiles (id) on delete cascade,
  scope public.consent_scope not null,
  granted boolean not null,
  reason text not null default 'user' check (reason in ('user', 'disconnect', 'block')),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index consent_history_connection_idx on public.consent_history (connection_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Internal: revoke every granted consent on a connection (with history).
-- ---------------------------------------------------------------------------
create or replace function public.revoke_all_consent(p_connection uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pref public.consent_preferences%rowtype;
  v_customer uuid;
  v_scope public.consent_scope;
begin
  select * into v_pref from public.consent_preferences where connection_id = p_connection for update;
  if not found then
    return;
  end if;
  select customer_user_id into v_customer from public.customer_connections where id = p_connection;

  foreach v_scope in array enum_range(null::public.consent_scope) loop
    if (to_jsonb(v_pref) ->> v_scope::text)::boolean then
      insert into public.consent_history (connection_id, customer_user_id, scope, granted, reason, changed_by)
      values (p_connection, v_customer, v_scope, false, p_reason, auth.uid());
    end if;
  end loop;

  update public.consent_preferences
     set direct_messages = false, shift_notifications = false, marketing = false,
         shared_preferences = false, loyalty = false
   where connection_id = p_connection;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer: request a connection to a published professional.
-- ---------------------------------------------------------------------------
create or replace function public.request_connection(p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.hospitality_profiles%rowtype;
  v_existing public.customer_connections%rowtype;
  v_id uuid;
  v_recent int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.has_role('customer') then
    raise exception 'customer_role_required' using errcode = '42501';
  end if;

  select * into v_profile from public.hospitality_profiles
   where username = lower(trim(p_username)) and is_published;
  if not found or v_profile.user_id = v_uid then
    raise exception 'professional_unavailable' using errcode = '22023';
  end if;

  -- Rate limit: 30 connection requests per customer per rolling 24 hours.
  select count(*) into v_recent from public.customer_connections
   where customer_user_id = v_uid and requested_at > now() - interval '24 hours';
  if v_recent >= 30 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  select * into v_existing from public.customer_connections
   where customer_user_id = v_uid and hospitality_profile_id = v_profile.id
   for update;

  if found then
    if v_existing.status = 'disconnected' then
      update public.customer_connections
         set status = 'pending', requested_at = now(), responded_at = null,
             blocked_by = null, status_changed_at = now()
       where id = v_existing.id
      returning id into v_id;
    elsif v_existing.status in ('pending', 'accepted') then
      raise exception 'already_requested' using errcode = '23505';
    else
      -- declined or blocked: do not reveal which.
      raise exception 'professional_unavailable' using errcode = '22023';
    end if;
  else
    insert into public.customer_connections (customer_user_id, hospitality_profile_id)
    values (v_uid, v_profile.id)
    returning id into v_id;
    insert into public.consent_preferences (connection_id) values (v_id);
  end if;

  perform public.write_audit('connection.requested', 'customer_connection', v_id, '{}'::jsonb);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Professional: accept, decline, disconnect or block.
-- ---------------------------------------------------------------------------
create or replace function public.professional_update_connection(p_connection uuid, p_action text)
returns public.connection_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.customer_connections%rowtype;
  v_new public.connection_status;
begin
  select cc.* into v_row
    from public.customer_connections cc
    join public.hospitality_profiles hp on hp.id = cc.hospitality_profile_id
   where cc.id = p_connection and hp.user_id = auth.uid()
   for update of cc;
  if not found then
    raise exception 'connection_not_found' using errcode = '42501';
  end if;

  v_new := case
    when p_action = 'accept' and v_row.status = 'pending' then 'accepted'
    when p_action = 'decline' and v_row.status = 'pending' then 'declined'
    when p_action = 'disconnect' and v_row.status = 'accepted' then 'disconnected'
    when p_action = 'block' and v_row.status <> 'blocked' then 'blocked'
    else null
  end::public.connection_status;

  if v_new is null then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.customer_connections
     set status = v_new,
         blocked_by = case when v_new = 'blocked' then 'professional' else blocked_by end,
         responded_at = case when v_row.status = 'pending' then now() else responded_at end,
         status_changed_at = now()
   where id = v_row.id;

  if v_new in ('declined', 'disconnected', 'blocked') then
    perform public.revoke_all_consent(v_row.id, case when v_new = 'blocked' then 'block' else 'disconnect' end);
  end if;

  perform public.write_audit('connection.professional_' || p_action, 'customer_connection', v_row.id,
    jsonb_build_object('from', v_row.status, 'to', v_new));
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer: cancel a pending request, disconnect or block.
-- ---------------------------------------------------------------------------
create or replace function public.customer_update_connection(p_connection uuid, p_action text)
returns public.connection_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.customer_connections%rowtype;
  v_new public.connection_status;
begin
  select * into v_row from public.customer_connections
   where id = p_connection and customer_user_id = auth.uid()
   for update;
  if not found then
    raise exception 'connection_not_found' using errcode = '42501';
  end if;

  v_new := case
    when p_action = 'cancel' and v_row.status = 'pending' then 'disconnected'
    when p_action = 'disconnect' and v_row.status = 'accepted' then 'disconnected'
    -- A customer cannot override a block placed by the professional.
    when p_action = 'block' and v_row.status <> 'blocked' then 'blocked'
    else null
  end::public.connection_status;

  if v_new is null then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.customer_connections
     set status = v_new,
         blocked_by = case when v_new = 'blocked' then 'customer' else blocked_by end,
         status_changed_at = now()
   where id = v_row.id;

  perform public.revoke_all_consent(v_row.id, case when v_new = 'blocked' then 'block' else 'disconnect' end);
  perform public.write_audit('connection.customer_' || p_action, 'customer_connection', v_row.id,
    jsonb_build_object('from', v_row.status, 'to', v_new));
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer: grant or revoke a single consent scope.
-- Granting requires an accepted connection; revoking is always allowed.
-- ---------------------------------------------------------------------------
create or replace function public.set_consent(p_connection uuid, p_scope public.consent_scope, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.customer_connections%rowtype;
  v_current boolean;
begin
  select * into v_row from public.customer_connections
   where id = p_connection and customer_user_id = auth.uid();
  if not found then
    raise exception 'connection_not_found' using errcode = '42501';
  end if;
  if p_granted and v_row.status <> 'accepted' then
    raise exception 'connection_not_accepted' using errcode = '22023';
  end if;

  select (to_jsonb(cp) ->> p_scope::text)::boolean into v_current
    from public.consent_preferences cp where cp.connection_id = p_connection for update;
  if v_current is not distinct from p_granted then
    return;
  end if;

  execute format('update public.consent_preferences set %I = $1 where connection_id = $2', p_scope::text)
    using p_granted, p_connection;

  insert into public.consent_history (connection_id, customer_user_id, scope, granted, changed_by)
  values (p_connection, v_row.customer_user_id, p_scope, p_granted, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Professional: list connections with only the fields they are allowed to see.
-- ---------------------------------------------------------------------------
create or replace function public.list_professional_connections()
returns table (
  id uuid,
  status public.connection_status,
  customer_display_name text,
  requested_at timestamptz,
  direct_messages boolean,
  shift_notifications boolean,
  marketing boolean,
  shared_preferences boolean,
  loyalty boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select cc.id,
         cc.status,
         -- Name only once a request exists; no email, no other account data.
         coalesce(cust.display_name, p.display_name, 'Customer') as customer_display_name,
         cc.requested_at,
         coalesce(cp.direct_messages, false) and cc.status = 'accepted',
         coalesce(cp.shift_notifications, false) and cc.status = 'accepted',
         coalesce(cp.marketing, false) and cc.status = 'accepted',
         coalesce(cp.shared_preferences, false) and cc.status = 'accepted',
         coalesce(cp.loyalty, false) and cc.status = 'accepted'
    from public.customer_connections cc
    join public.hospitality_profiles hp on hp.id = cc.hospitality_profile_id
    left join public.customer_profiles cust on cust.user_id = cc.customer_user_id
    left join public.profiles p on p.id = cc.customer_user_id
    left join public.consent_preferences cp on cp.connection_id = cc.id
   where hp.user_id = auth.uid()
     -- Blocked-by-customer rows are hidden from the professional entirely.
     and not (cc.status = 'blocked' and cc.blocked_by = 'customer')
     and cc.status in ('pending', 'accepted', 'blocked')
   order by cc.requested_at desc;
$$;

-- RLS ------------------------------------------------------------------------
alter table public.customer_profiles enable row level security;
alter table public.customer_connections enable row level security;
alter table public.consent_preferences enable row level security;
alter table public.consent_history enable row level security;

revoke all on public.customer_profiles, public.customer_connections,
  public.consent_preferences, public.consent_history from anon, authenticated;

grant select on public.customer_profiles to authenticated;
grant insert (user_id, display_name, visitor_type) on public.customer_profiles to authenticated;
grant update (display_name, visitor_type) on public.customer_profiles to authenticated;
grant select on public.customer_connections to authenticated;
grant select on public.consent_preferences to authenticated;
grant select on public.consent_history to authenticated;

-- Customer profiles: owner only. Professionals get names via
-- list_professional_connections(), never via table access.
create policy customer_profiles_select_own on public.customer_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy customer_profiles_insert_own on public.customer_profiles
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_role('customer'));

create policy customer_profiles_update_own on public.customer_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Connections: the customer, or the professional (except customer-placed blocks).
create policy customer_connections_select on public.customer_connections
  for select to authenticated
  using (
    customer_user_id = auth.uid()
    or (public.owns_hospitality_profile(hospitality_profile_id)
        and not (status = 'blocked' and blocked_by = 'customer'))
  );

create policy consent_preferences_select_customer on public.consent_preferences
  for select to authenticated
  using (exists (
    select 1 from public.customer_connections cc
    where cc.id = connection_id and cc.customer_user_id = auth.uid()
  ));

create policy consent_history_select_customer on public.consent_history
  for select to authenticated
  using (customer_user_id = auth.uid());

revoke execute on function public.revoke_all_consent(uuid, text) from public, anon, authenticated;
revoke execute on function public.request_connection(text) from public, anon;
grant execute on function public.request_connection(text) to authenticated;
revoke execute on function public.professional_update_connection(uuid, text) from public, anon;
grant execute on function public.professional_update_connection(uuid, text) to authenticated;
revoke execute on function public.customer_update_connection(uuid, text) from public, anon;
grant execute on function public.customer_update_connection(uuid, text) to authenticated;
revoke execute on function public.set_consent(uuid, public.consent_scope, boolean) from public, anon;
grant execute on function public.set_consent(uuid, public.consent_scope, boolean) to authenticated;
revoke execute on function public.list_professional_connections() from public, anon;
grant execute on function public.list_professional_connections() to authenticated;
