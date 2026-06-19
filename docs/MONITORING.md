# Monitoring — TaskWave

## Health check

- `GET /api/health/supabase` — verifica connessione DB e latenza.

## Error tracking (Sentry)

1. Crea progetto su [sentry.io](https://sentry.io).
2. Aggiungi su Vercel:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
   ```
3. Gli errori server-side passano da `src/lib/monitoring.ts` (`captureException`).
4. Per integrazione completa Next.js, valuta `@sentry/nextjs` in un secondo momento.

## Log operativi

- **Vercel**: Functions logs per API routes.
- **Supabase**: Dashboard → Logs (Auth, Postgres, Realtime).
- **Resend**: Dashboard email delivery per opt-out e inviti.

## Alert consigliati

- Health check fallito > 3 minuti
- Spike 5xx su `/api/*`
- Rate limit superato su `/api/privacy/opt-out` (possibile abuso)
