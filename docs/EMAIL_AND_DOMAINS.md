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
- **Workspace invites via share link** — create an invite, use **Copy link** in the team panel, send the URL manually (chat, SMS, etc.)
- Invite acceptance at `/invite/[token]` — works on the Vercel URL

The invite API creates the invitation even if email delivery fails. The UI shows the link so admins are never blocked.

---

## What does not work without a custom domain

- Automatic invitation emails to arbitrary addresses
- Verified sender for Supabase Auth (signup confirmation, password reset) via your own `@yourdomain` address
- Using `*.vercel.app` as the Resend sending domain — **you do not control Vercel’s DNS**

### Resend sandbox default

If `RESEND_FROM` is unset, the code falls back to `onboarding@resend.dev`. That is **Resend’s sandbox sender**: it only delivers to the email address on your Resend account, not to teammates or customers. Do not rely on it for production invites.

---

## Inviting teammates today (no domain)

1. Open your workspace → **Team**
2. Enter the member’s email and send the invite
3. If email is not configured, use **Copy link** on the pending invite
4. Share the link (e.g. `https://taskwave-rust.vercel.app/invite/<token>`)
5. The invitee registers or logs in with **the same email** as the invitation, then accepts

Invites expire after 14 days (configurable in the database).

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

- `src/lib/email/resend.ts` — Resend client; non-fatal errors on invite route
- `src/app/api/workspaces/[id]/invite/route.ts` — creates invite + optional email
- `.env.example` — environment variable reference

Live demo: [taskwave-rust.vercel.app](https://taskwave-rust.vercel.app)
