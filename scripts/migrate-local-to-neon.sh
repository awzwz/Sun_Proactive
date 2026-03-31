#!/usr/bin/env bash
# Replace Neon data with a data-only dump from local Docker Postgres (pg16).
# Usage:
#   export NEON_DATABASE_URL="postgresql://user:pass@ep-xxx.../neondb?sslmode=require"
#   ./scripts/migrate-local-to-neon.sh
#
# Requires: docker (db container sun-proactive-db-1), psql, same Prisma schema on both sides.

set -euo pipefail

NEON_URL="${NEON_DATABASE_URL:-}"
if [[ -z "$NEON_URL" ]]; then
  echo "Set NEON_DATABASE_URL to your Neon direct connection string." >&2
  exit 1
fi

CONTAINER="${POSTGRES_CONTAINER:-sun-proactive-db-1}"
DUMP="$(mktemp /tmp/sunproactive_data_XXXX.sql)"

cleanup() { rm -f "$DUMP"; }
trap cleanup EXIT

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker exec "$CONTAINER" pg_dump -U postgres -d sunproactive \
    --data-only --no-owner --no-privileges >"$DUMP"
else
  echo "Container $CONTAINER not running. Start: docker compose up db -d" >&2
  exit 1
fi

psql "$NEON_URL" -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE TABLE
  "_ConversationParticipants",
  "DirectMessage",
  "ChatMessage",
  "Notification",
  "Application",
  "Task",
  "Conversation",
  "User"
RESTART IDENTITY CASCADE;
SQL

psql "$NEON_URL" -v ON_ERROR_STOP=1 -f "$DUMP"
echo "Done. Row counts on Neon:"
psql "$NEON_URL" -c "SELECT 'User' AS t, COUNT(*)::int AS c FROM \"User\" UNION ALL SELECT 'Task', COUNT(*)::int FROM \"Task\" UNION ALL SELECT 'Application', COUNT(*)::int FROM \"Application\";"
