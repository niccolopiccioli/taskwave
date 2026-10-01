#!/usr/bin/env bash
# Set Supabase Auth session limits (JWT + inactivity timeout).
# Default: 4 hours — users must re-login after that.
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-lcubcugivegahjsbmepy}"
# 4 hours in seconds
SESSION_SECONDS="${SESSION_SECONDS:-14400}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT_DIR/.env.local" && set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN."
  exit 1
fi

curl -sS -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"jwt_exp\": ${SESSION_SECONDS},
    \"sessions_inactivity_timeout\": ${SESSION_SECONDS}
  }" | python3 -m json.tool

echo "Done. JWT and inactivity timeout: ${SESSION_SECONDS}s ($(( SESSION_SECONDS / 3600 ))h)"
