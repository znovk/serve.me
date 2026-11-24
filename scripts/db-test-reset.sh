#!/usr/bin/env bash
# Recreate the LOCAL test database from scratch (plain Postgres + Supabase stub).
# Never point this at a real Supabase project.
set -euo pipefail
DB="${TEST_DB_NAME:-barconnect_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -d postgres -c "drop database if exists ${DB} with (force)"
"${PSQL[@]}" -d postgres -c "create database ${DB}"
"${PSQL[@]}" -d "${DB}" -f supabase/tests/local-stub/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "${DB}" -f "$f"
done
if [[ "${WITH_SEED:-0}" == "1" ]]; then
  "${PSQL[@]}" -d "${DB}" -f supabase/seed.sql
fi
echo "Local test database ${DB} ready."
