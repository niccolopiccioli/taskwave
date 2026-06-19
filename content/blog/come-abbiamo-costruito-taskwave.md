---
title: Come abbiamo costruito TaskWave
excerpt: Stack Next.js, Supabase e Stripe — architettura, realtime e lezioni apprese nello sviluppo del prodotto.
date: 18 Gen 2026
category: Engineering
readTime: 8 min
---

TaskWave è un'app Next.js 14 con Supabase Auth, PostgreSQL + RLS e Stripe in test mode.

## Perché Supabase

Row Level Security ci permette di enforcement dei limiti piano lato database. Realtime Presence mostra quanti membri sono sulla board.

## Backend legacy

La cartella `backend/` Django è deprecata e non usata in produzione. Tutta la logica vive in API Routes Next.js e RPC Postgres.

## Prossimi passi

Webhook Business, custom fields, audit log e API v1 REST per integrazioni enterprise.
