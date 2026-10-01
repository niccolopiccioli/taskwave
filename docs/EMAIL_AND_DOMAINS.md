# Email & domains

TaskWave can run in production on a **Vercel subdomain only** (e.g. `https://taskwave-rust.vercel.app`) without owning a custom domain. This document explains what works, what does not, and how to enable transactional email when you are ready.

## Quick summary

| Scenario | App URL | Automatic emails to any user |
|----------|---------|------------------------------|
| Vercel subdomain only | `*.vercel.app` | **No** — Resend cannot verify `vercel.app` |
| Custom domain + DNS | Any | **Yes** — after verifying the domain in Resend |

**App hosting and email sending use different domains.** Your site can stay on `taskwave-rust.vercel.app` forever; email only needs a domain you control for DNS (DKIM/SPF).

---

## What works without a custom domain

- Full app: workspaces, boards, realtime, billing, API
- **Workspace invites in-app** — existing users get a dashboard notification; new users accept via **Copy link** + `/invite/[token]`

---

## What does not work without a custom domain

- **Automatic invitation emails** to arbitrary addresses (Resend API) — use in-app notification + share link instead
- Verified sender for Supabase Auth (signup confirmation, password reset) via your own `@yourdomain` address
- Using `*.vercel.app` as the Resend sending domain — **you do not control Vercel’s DNS**

### Resend sandbox default

If `RESEND_FROM` is unset, the code falls back to `onboarding@resend.dev`. That is **Resend’s sandbox sender**: it only delivers to the email address on your Resend account, not to teammates or customers. Do not rely on it for production invites.

---

## Workspace team invites (no custom domain required)

Team invites **do not use the Resend API**. When you invite someone:

1. A pending invitation is stored in the database with a unique link.
2. **If they already have a TaskWave account** — they get an **in-app notification** and see the invite banner on `/dashboard`.
3. **If they are new** — use **Copy link** in the Team panel and share the URL (chat, etc.). They must register with the **invited email** and accept.

This works without verifying a sending domain. Resend is still used for auth emails (signup, password reset) and optional contact form when configured.

### Periodic step-up OTP (optional, off by default)

Every 4 hours the app can ask for a 6-digit code sent by email. **Leave `STEP_UP_OTP_ENABLED` unset** until you verify a domain in Resend; then set on Vercel:

```env
STEP_UP_OTP_ENABLED=true
```

---

## Enabling email later (recommended path)

You need **any domain you own** (~$10/year from Cloudflare, Namecheap, etc.). The app URL does not need to change.

### 1. Add the domain in Resend

1. [Resend Dashboard → Domains](https://resend.com/domains) → **Add domain**
2. Use a subdomain for sending, e.g. `send.yourdomain.com` (region `eu-west-1` if your project is in EU)

### 2. Add DNS records at your registrar

Resend shows three records (names vary slightly by region):

| Type | Host (example) | Value |
|------|----------------|--------|
| TXT | `resend._domainkey.send` | DKIM public key from Resend |
| MX | `bounce.send` | `feedback-smtp.eu-west-1.amazonses.com` (priority 10) |
| TXT | `bounce.send` | `v=spf1 include:amazonses.com ~all` |

On Cloudflare: use **DNS only** (gray cloud), not proxied.

### 3. Verify and configure TaskWave

```bash
# After DNS propagates (often 5–60 minutes)
bash scripts/setup-resend-domain.sh --verify

# Supabase Auth SMTP (optional but recommended)
RESEND_FROM='TaskWave <hello@send.yourdomain.com>' \
  bash scripts/configure-supabase-resend-smtp.sh
```

Set on **Vercel → Production**:

```env
RESEND_FROM=TaskWave <hello@send.yourdomain.com>
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=https://taskwave-rust.vercel.app
```

Redeploy after changing environment variables.

Helper scripts in this repo:

- `scripts/setup-resend-domain.sh` — DNS checklist + verify via API
- `scripts/configure-supabase-resend-smtp.sh` — Supabase Auth → Resend SMTP
- `scripts/sync-supabase-auth-templates.sh` — branded auth HTML in Supabase

---

## Optional: custom domain for the website

Connecting `yourdomain.com` to Vercel is **separate** from email. You can:

- Keep the app on `taskwave-rust.vercel.app` and only verify `send.yourdomain.com` for email, or
- Add `yourdomain.com` in Vercel → Domains for a prettier URL (still need DNS for Resend on the sending subdomain)

---

## Troubleshooting

| Error | Cause | Fix |
|-------|--------|-----|
| `The send.* domain is not verified` | DNS not set or not propagated | Add records; run `setup-resend-domain.sh --verify` |
| `403` from Resend API | Unverified domain in `RESEND_FROM` | Verify domain or use **Copy link** for invites |
| Invite “not found” | Wrong token, expired, or cancelled | Re-invite; pending invite gets a new token |
| Invitee email mismatch | Logged in with a different email | Log in with the invited address |

---

## Related files

- `src/lib/email/resend.ts` — Resend client (auth, contact form, step-up OTP)
- `src/app/api/workspaces/[id]/invite/route.ts` — creates invite + in-app notification (no Resend)
- `.env.example` — environment variable reference

Live demo: [taskwave-rust.vercel.app](https://taskwave-rust.vercel.app)
