# Backup e disaster recovery — TaskWave

## Supabase PostgreSQL

1. Abilita **Point-in-Time Recovery (PITR)** dal dashboard Supabase (Pro plan o add-on).
2. Snapshot giornalieri automatici gestiti da Supabase — verifica retention in **Database → Backups**.
3. Export manuale periodico:
   ```bash
   npx supabase db dump --project-ref lcubcugivegahjsbmepy -f backup-$(date +%F).sql
   ```
4. Conserva dump cifrati fuori dal progetto primario (S3, Backblaze, ecc.).

## Auth e storage

- Esporta elenco utenti da Supabase Auth prima di major migration.
- Allegati task: se usi Supabase Storage, replica bucket con policy di lifecycle.

## Runbook ripristino

1. Crea branch Supabase o ripristina da PITR a timestamp noto.
2. Aggiorna env Vercel se cambia URL/keys del progetto ripristinato.
3. Verifica `/api/health/supabase` e login smoke test.
4. Comunica downtime agli utenti se > 15 minuti.

## SLA interno

- RPO target: 24h (export giornaliero)
- RTO target: 4h (ripristino da backup Supabase)
