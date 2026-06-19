#!/usr/bin/env bash
# Configure Supabase Auth to send emails via Resend SMTP (TaskWave branding).
# Requires: SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
# Optional: RESEND_API_KEY (defaults to env or .env.local)

set -euo pipefail

PROJECT_REF="${PROJECT_REF:-lcubcugivegahjsbmepy}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_URL="${NEXT_PUBLIC_APP_URL:-https://taskwave-rust.vercel.app}"

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT_DIR/.env.local" && set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN."
  echo "Create one at: https://supabase.com/dashboard/account/tokens"
  echo "Then run: SUPABASE_ACCESS_TOKEN=sbp_... $0"
  exit 1
fi

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "Missing RESEND_API_KEY."
  exit 1
fi

curl -sS -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"external_email_enabled\": true,
    \"mailer_autoconfirm\": true,
    \"site_url\": \"${APP_URL}\",
    \"uri_allow_list\": \"${APP_URL}/**,http://localhost:3000/**\",
    \"smtp_admin_email\": \"onboarding@resend.dev\",
    \"smtp_host\": \"smtp.resend.com\",
    \"smtp_port\": \"465\",
    \"smtp_user\": \"resend\",
    \"smtp_pass\": \"${RESEND_API_KEY}\",
    \"smtp_sender_name\": \"TaskWave\"
  }" | python3 -m json.tool

echo ""
echo "Done. Test registration at ${APP_URL}/register"
echo "Note: onboarding@resend.dev only delivers to your Resend account email until you verify a domain."
