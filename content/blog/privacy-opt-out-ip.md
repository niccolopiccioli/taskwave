---
title: Privacy e opt-out IP in TaskWave
excerpt: Come rispettiamo GPC, Do Not Track e le preferenze cookie con hash IP e nessun dato in chiaro.
date: 19 Giu 2026
category: Product
readTime: 4 min
---

TaskWave non salva indirizzi IP in chiaro nel database. Quando necessario associare una preferenza di opt-out, usiamo un hash SHA-256 con salt dedicato.

## Opt-out pubblico

Visita `/privacy/opt-out` per applicare l'opt-out alla sessione corrente o confermare via email. Rispettiamo anche il segnale **Global Privacy Control** e **Do Not Track**.

## Account loggati

Nelle impostazioni account, tab Privacy, puoi disattivare tracciamento IP, analytics e marketing in qualsiasi momento.

## Diritti GDPR

Export JSON e cancellazione account sono disponibili dalle stesse impostazioni Privacy.
