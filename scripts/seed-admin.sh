#!/usr/bin/env bash
set -euo pipefail

# Seed admin user on remote Supabase project using the Auth Admin API.
# Requires SUPABASE_SERVICE_ROLE_KEY (the REAL one, not the webhook dummy).
#
# Usage:
#   bash scripts/seed-admin.sh
#
# Credenziali create:
#   Email:  admin@taskwave.local
#   Pass:   TaskWave2026!

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

load_env() {
  if [ -f "$ROOT_DIR/.env.local" ]; then
    set -a
    source "$ROOT_DIR/.env.local"
    set +a
  fi
}

check_requirements() {
  if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "not_required_for_webhook" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY non configurato o è il dummy 'not_required_for_webhook'"
    echo "   Aggiungi la vera service_role key nel .env.local"
    exit 1
  fi
  if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL non configurato nel .env.local"
    exit 1
  fi
}

create_user() {
  local email="admin@taskwave.local"
  local password="TaskWave2026!"
  local name="TaskWave Admin"
  local url="${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users"

  echo "📧 Email:        $email"
  echo "🔑 Password:     $password"
  echo "🌐 Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
  echo ""

  # Check if user exists first
  local existing
  existing=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users?filter=email&value=$email" 2>/dev/null || echo "000")

  echo "→ Creazione utente admin..."
  local response
  response=$(curl -s -X POST "$url" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"full_name\": \"$name\"
      }
    }" 2>/dev/null)

  local id
  id=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

  if [ -n "$id" ]; then
    echo "✅ Utente admin creato: $id"

    # Set to business plan
    echo "→ Impostazione piano Business..."
    local plan_response
    plan_response=$(curl -s -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/sync_profile_plan" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"p_user_id\": \"$id\",
        \"p_plan\": \"business\",
        \"p_webhook_secret\": \"taskflow_webhook_2026\"
      }" 2>/dev/null)

    echo "✅ Piano Business attivato"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Credenziali Admin"
    echo "  Email:    admin@taskwave.local"
    echo "  Password: TaskWave2026!"
    echo "  Piano:    Business (tutte le feature sbloccate)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  else
    echo "⚠️  Risposta API: $response"
    echo "   Probabilmente l'utente esiste già o il service_role key non è valido."
  fi
}

main() {
  echo "═══ TaskWave - Seed Admin User ═══"
  echo ""
  load_env
  check_requirements
  create_user
}

main
