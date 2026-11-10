#!/usr/bin/env bash
# Applies every SQL file in supabase/migrations/ to a Supabase Postgres database, in filename order.
# Each file runs once: applied files are recorded in public.schema_migrations, so running this
# again only applies new files. Each file runs in its own transaction and stops on the first error.
#
# Usage (from the repo root):
#   DATABASE_URL="postgresql://postgres:<password>@<host>:5432/postgres" ./scripts/db-migrate.sh
#   ./scripts/db-migrate.sh                 # reads DATABASE_URL from apps/backend/.env if not set
#   ./scripts/db-migrate.sh --status        # show which files are applied or pending, change nothing
#   ./scripts/db-migrate.sh --baseline      # mark every file as applied WITHOUT running it
#                                           # (for a database that already has the schema)
set -euo pipefail

cd "$(dirname "$0")/.."
MIGRATIONS_DIR="supabase/migrations"

if [ -z "${DATABASE_URL:-}" ] && [ -f apps/backend/.env ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' apps/backend/.env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set (and not found in apps/backend/.env)." >&2
  exit 1
fi
command -v psql >/dev/null || { echo "psql is not installed (macOS: brew install libpq && brew link --force libpq)." >&2; exit 1; }

MODE="${1:-apply}"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q -At)

"${PSQL[@]}" -c "create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
); alter table public.schema_migrations enable row level security;" >/dev/null

applied="$("${PSQL[@]}" -c "select filename from public.schema_migrations")"
is_applied() { grep -qxF "$1" <<<"$applied"; }

count=0
for path in "$MIGRATIONS_DIR"/*.sql; do
  file="$(basename "$path")"
  if is_applied "$file"; then
    [ "$MODE" = "--status" ] && echo "applied  $file"
    continue
  fi
  case "$MODE" in
    --status)
      echo "PENDING  $file"
      ;;
    --baseline)
      "${PSQL[@]}" -c "insert into public.schema_migrations(filename) values ('$file') on conflict do nothing" >/dev/null
      echo "marked   $file"
      count=$((count + 1))
      ;;
    apply)
      echo "applying $file"
      "${PSQL[@]}" --single-transaction \
        -f "$path" \
        -c "insert into public.schema_migrations(filename) values ('$file')" >/dev/null
      count=$((count + 1))
      ;;
    *)
      echo "Unknown option: $MODE (use --status or --baseline, or nothing to apply)." >&2
      exit 1
      ;;
  esac
done

if [ "$MODE" = "apply" ]; then
  # Make the Supabase API (PostgREST) see new tables right away.
  "${PSQL[@]}" -c "notify pgrst, 'reload schema'" >/dev/null
  echo "Done: $count new migration(s) applied."
elif [ "$MODE" = "--baseline" ]; then
  echo "Done: $count migration(s) marked as applied."
fi
