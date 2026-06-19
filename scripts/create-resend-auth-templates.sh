#!/usr/bin/env bash
# Create or update TaskWave auth templates on Resend.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT_DIR/.env.local" ]]; then set -a; source "$ROOT_DIR/.env.local"; set +a; fi
: "${RESEND_API_KEY:?RESEND_API_KEY required}"

FROM="TaskWave <onboarding@resend.dev>"
APP_URL="${NEXT_PUBLIC_APP_URL:-https://taskwave-rust.vercel.app}"
AUTH="Authorization: Bearer ${RESEND_API_KEY}"

wrap_html() {
  local title="$1"
  local body="$2"
  cat <<EOF
<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#18181b;border:1px solid #27272a;border-radius:12px;">
<tr><td style="padding:28px 32px 12px;text-align:center;"><span style="font-size:20px;font-weight:700;color:#fafafa;">TaskWave</span></td></tr>
<tr><td style="padding:8px 32px 24px;color:#e4e4e7;font-size:16px;line-height:26px;">
<p style="margin:0 0 16px;color:#fafafa;font-size:22px;line-height:30px;">${title}</p>
${body}
</td></tr>
<tr><td style="padding:0 32px 28px;color:#71717a;font-size:12px;line-height:20px;text-align:center;">TaskWave · <a href="${APP_URL}" style="color:#2dd4bf;text-decoration:none;">${APP_URL}</a></td></tr>
</table></td></tr></table></body></html>
EOF
}

btn() {
  local label="$1" url="$2"
  printf '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td bgcolor="#14b8a6" style="background-color:#14b8a6;border-radius:8px;"><a href="%s" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#09090b;text-decoration:none;">%s</a></td></tr></table>' "$url" "$label"
}

upsert_tpl() {
  local name="$1" alias="$2" subject="$3" text="$4" html="$5" vars="$6"
  local payload id

  payload=$(jq -n \
    --arg name "$name" --arg alias "$alias" --arg subject "$subject" \
    --arg from "$FROM" --arg html "$html" --arg text "$text" \
    --argjson vars "$vars" \
    '{name:$name,alias:$alias,subject:$subject,from:$from,html:$html,text:$text,variables:$vars}')

  id=$(curl -sS -X POST https://api.resend.com/templates \
    -H "$AUTH" -H "Content-Type: application/json" -d "$payload" | jq -r '.id // empty')

  if [[ -z "$id" ]]; then
    curl -sS -X PATCH "https://api.resend.com/templates/${alias}" \
      -H "$AUTH" -H "Content-Type: application/json" \
      -d "$(jq -n --arg name "$name" --arg subject "$subject" --arg from "$FROM" --arg html "$html" --arg text "$text" --argjson vars "$vars" '{name:$name,subject:$subject,from:$from,html:$html,text:$text,variables:$vars}')" >/dev/null
    id="$alias"
  fi

  curl -sS -X POST "https://api.resend.com/templates/${id}/publish" -H "$AUTH" >/dev/null
  echo "published $alias"
}

BTN_CONFIRM=$(btn "Conferma email" "{{{CONFIRMATION_URL}}}")
BTN_RESET=$(btn "Reimposta password" "{{{RESET_URL}}}")
BTN_MAGIC=$(btn "Accedi ora" "{{{MAGIC_LINK_URL}}}")
BTN_CHANGE=$(btn "Conferma nuova email" "{{{CONFIRMATION_URL}}}")
BTN_INVITE=$(btn "Accetta invito" "{{{INVITE_URL}}}")

upsert_tpl "TaskWave - Conferma email" "taskwave-confirm-email" \
  "Conferma il tuo account TaskWave" \
  "Conferma il tuo account: {{{CONFIRMATION_URL}}}" \
  "$(wrap_html "Conferma la tua email" "<p style=\"margin:0 0 12px;\">Grazie per esserti registrato su TaskWave. Clicca per confermare il tuo indirizzo email.</p>${BTN_CONFIRM}<p style=\"margin:0;color:#a1a1aa;font-size:13px;\">Se non hai creato un account, ignora questa email.</p>")" \
  '[{"key":"CONFIRMATION_URL","type":"string","fallbackValue":"'"$APP_URL"'"}]'

upsert_tpl "TaskWave - Reset password" "taskwave-reset-password" \
  "Reimposta la password TaskWave" \
  "Reimposta la password: {{{RESET_URL}}}" \
  "$(wrap_html "Reimposta la password" "<p style=\"margin:0 0 12px;\">Abbiamo ricevuto una richiesta di reset password per il tuo account TaskWave.</p>${BTN_RESET}<p style=\"margin:0;color:#a1a1aa;font-size:13px;\">Se non l'hai richiesto tu, ignora questa email.</p>")" \
  '[{"key":"RESET_URL","type":"string","fallbackValue":"'"$APP_URL"'"}]'

upsert_tpl "TaskWave - Codice OTP" "taskwave-otp" \
  "Il tuo codice TaskWave" \
  "Codice: {{{OTP_CODE}}}" \
  "$(wrap_html "Codice di verifica" "<p style=\"margin:0 0 12px;\">Usa questo codice per completare l'accesso a TaskWave:</p><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"#27272a\" style=\"background-color:#27272a;border-radius:10px;padding:18px;\"><span style=\"font-size:32px;font-weight:700;letter-spacing:8px;color:#2dd4bf;font-family:Courier New,monospace;\">{{{OTP_CODE}}}</span></td></tr></table><p style=\"margin:12px 0 0;color:#a1a1aa;font-size:13px;\">Non condividerlo con nessuno.</p>")" \
  '[{"key":"OTP_CODE","type":"string","fallbackValue":"000000"}]'

upsert_tpl "TaskWave - Magic link" "taskwave-magic-link" \
  "Accedi a TaskWave" \
  "Accedi: {{{MAGIC_LINK_URL}}}" \
  "$(wrap_html "Accedi al tuo account" "<p style=\"margin:0 0 12px;\">Clicca per accedere a TaskWave. Il link scade a breve.</p>${BTN_MAGIC}")" \
  '[{"key":"MAGIC_LINK_URL","type":"string","fallbackValue":"'"$APP_URL"'"}]'

upsert_tpl "TaskWave - Cambio email" "taskwave-email-change" \
  "Conferma il nuovo indirizzo email TaskWave" \
  "Conferma {{{NEW_EMAIL}}}: {{{CONFIRMATION_URL}}}" \
  "$(wrap_html "Conferma nuova email" "<p style=\"margin:0 0 12px;\">Conferma <strong style=\"color:#fafafa;\">{{{NEW_EMAIL}}}</strong> come nuovo indirizzo TaskWave.</p>${BTN_CHANGE}")" \
  '[{"key":"CONFIRMATION_URL","type":"string","fallbackValue":"'"$APP_URL"'"},{"key":"NEW_EMAIL","type":"string","fallbackValue":"email@esempio.it"}]'

upsert_tpl "TaskWave - Invito workspace" "taskwave-invite" \
  "Invito su TaskWave" \
  "Invito workspace {{{WORKSPACE_NAME}}}: {{{INVITE_URL}}}" \
  "$(wrap_html "Invito al workspace" "<p style=\"margin:0 0 12px;\">Sei stato invitato nel workspace <strong style=\"color:#fafafa;\">{{{WORKSPACE_NAME}}}</strong> su TaskWave.</p>${BTN_INVITE}")" \
  '[{"key":"INVITE_URL","type":"string","fallbackValue":"'"$APP_URL"'"},{"key":"WORKSPACE_NAME","type":"string","fallbackValue":"Workspace"}]'

echo "All TaskWave templates published."
