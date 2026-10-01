#!/usr/bin/env bash
# Resend domain setup for TaskWave (send.taskwave.app)
set -euo pipefail

DOMAIN_NAME="${RESEND_DOMAIN:-send.taskwave.app}"
DOMAIN_ID="${RESEND_DOMAIN_ID:-de66956a-f1d1-46e6-87a9-5e339618e095}"
REGION="${RESEND_REGION:-eu-west-1}"
FROM="${RESEND_FROM:-TaskWave <hello@send.taskwave.app>}"

echo "=== TaskWave · Resend domain setup ==="
echo ""
echo "Domain: ${DOMAIN_NAME} (${REGION})"
echo "Sender: ${FROM}"
echo ""
echo "Add these DNS records at your registrar (e.g. Cloudflare, Namecheap):"
echo ""
echo "1) DKIM — TXT"
echo "   Host: resend._domainkey.send"
echo "   Value: (copy from Resend dashboard → Domains → ${DOMAIN_NAME})"
echo ""
echo "2) SPF — MX"
echo "   Host: bounce.send"
echo "   Priority: 10"
echo "   Value: feedback-smtp.${REGION}.amazonses.com"
echo ""
echo "3) SPF — TXT"
echo "   Host: bounce.send"
echo "   Value: v=spf1 include:amazonses.com ~all"
echo ""
echo "Cloudflare: disable proxy (gray cloud) on all records."
echo ""
echo "After DNS propagation (5–60 min), verify:"
echo "  RESEND_API_KEY=re_... curl -X POST https://api.resend.com/domains/${DOMAIN_ID}/verify -H \"Authorization: Bearer \$RESEND_API_KEY\""
echo ""
echo "Then set on Vercel (Production):"
echo "  RESEND_FROM=${FROM}"
echo ""
echo "Re-run Supabase SMTP config:"
echo "  RESEND_FROM='${FROM}' SUPABASE_ACCESS_TOKEN=sbp_... bash scripts/configure-supabase-resend-smtp.sh"
echo ""

if [[ -n "${RESEND_API_KEY:-}" ]]; then
  echo "Checking domain status..."
  curl -sS "https://api.resend.com/domains/${DOMAIN_ID}" \
    -H "Authorization: Bearer ${RESEND_API_KEY}" | python3 -m json.tool 2>/dev/null || true
  echo ""
  if [[ "${1:-}" == "--verify" ]]; then
    echo "Triggering verification..."
    curl -sS -X POST "https://api.resend.com/domains/${DOMAIN_ID}/verify" \
      -H "Authorization: Bearer ${RESEND_API_KEY}" | python3 -m json.tool
  fi
else
  echo "Tip: export RESEND_API_KEY to check status. Use --verify after DNS is configured."
fi
