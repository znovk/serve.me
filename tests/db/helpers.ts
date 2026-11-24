import { Client } from "pg";

/**
 * Test harness for the LOCAL test database created by scripts/db-test-reset.sh
 * (plain Postgres + Supabase auth stub). Each test runs in a transaction that
 * is rolled back, and queries run as the real `anon` / `authenticated` roles
 * so RLS and grants are exercised exactly as PostgREST would.
 */
export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://root@localhost/barconnect_test?host=/var/run/postgresql";

export type Db = {
  client: Client;
  /** Run SQL as superuser (setup only — bypasses RLS). */
  admin<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Run SQL as an authenticated user. */
  as<T = Record<string, unknown>>(userId: string, sql: string, params?: unknown[]): Promise<T[]>;
  /** Run SQL as an anonymous visitor. */
  anon<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Assert a query fails; returns the error message. */
  fails(run: () => Promise<unknown>): Promise<string>;
  createUser(name: string, roles?: string[]): Promise<string>;
};

export async function openDb(): Promise<Db> {
  const client = new Client({ connectionString: TEST_DB_URL });
  await client.connect();

  async function scoped<T>(role: "anon" | "authenticated", userId: string | null, sql: string, params: unknown[]) {
    await client.query("savepoint scoped");
    try {
      await client.query(`set local role ${role}`);
      const claims = userId ? { sub: userId, role } : { role };
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      const res = await client.query(sql, params);
      await client.query("reset role");
      await client.query("release savepoint scoped");
      return res.rows as T[];
    } catch (err) {
      await client.query("rollback to savepoint scoped");
      await client.query("reset role");
      throw err;
    }
  }

  const db: Db = {
    client,
    async admin(sql, params = []) {
      return (await client.query(sql, params)).rows;
    },
    as(userId, sql, params = []) {
      return scoped("authenticated", userId, sql, params);
    },
    anon(sql, params = []) {
      return scoped("anon", null, sql, params);
    },
    async fails(run) {
      try {
        await run();
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
      throw new Error("Expected query to fail, but it succeeded");
    },
    async createUser(name, roles = []) {
      const [row] = await db.admin<{ id: string }>(
        "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
        [`${name}-${crypto.randomUUID()}@example.test`, { display_name: name }],
      );
      for (const role of roles) {
        await db.admin("insert into public.user_roles (user_id, role) values ($1, $2)", [row!.id, role]);
      }
      return row!.id;
    },
  };
  return db;
}
