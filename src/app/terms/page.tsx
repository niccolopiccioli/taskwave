'use client';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader />

      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-6 sm:mb-8">
            Termini di Servizio
          </h1>
          
          <div className="prose prose-slate max-w-none space-y-6">
            <p className="text-muted-foreground">
              Ultimo aggiornamento: 5 Marzo 2026
            </p>

            <h2 className="text-xl font-semibold">1. Accettazione dei termini</h2>
            <p className="text-muted-foreground">
              Accedendo o utilizzando TaskWave, accetti di essere vincolato da 
              questi Termini di Servizio. Se non accetti questi termini, non utilizzare 
              il servizio.
            </p>

            <h2 className="text-xl font-semibold">2. Descrizione del servizio</h2>
            <p className="text-muted-foreground">
              TaskWave è una piattaforma di project management che permette ai team 
              di gestire progetti, task e collaborare in modo efficiente. Il servizio 
              include funzionalità di board Kanban, gestione workspace, e integrazioni.
            </p>

            <h2 className="text-xl font-semibold">3. Account utente</h2>
            <p className="text-muted-foreground">
              Per utilizzare il servizio devi creare un account. Ti impegni a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fornire informazioni accurate e complete</li>
              <li>Mantieni sicure le tue credenziali di accesso</li>
              <li>Sei responsabile di tutte le attività sotto il tuo account</li>
              <li>Notificarci immediatamente qualsiasi uso non autorizzato</li>
            </ul>

            <h2 className="text-xl font-semibold">4. Utilizzo accettabile</h2>
            <p className="text-muted-foreground">
              Accetti di NON utilizzare il servizio per:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Attività illegali o non autorizzate</li>
              <li>Violare diritti di terzi</li>
              <li>Trasmettere malware o virus</li>
              <li>Interferire con il funzionamento del servizio</li>
              <li>Raccogliere dati di altri utenti senza consenso</li>
            </ul>

            <h2 className="text-xl font-semibold">5. Contenuti degli utenti</h2>
            <p className="text-muted-foreground">
              Sei proprietario dei contenuti che crei su TaskWave. Con la creazione 
              di contenuti, ci concedi una licenza per utilizzarli al fine di fornirti 
              il servizio.
            </p>

            <h2 className="text-xl font-semibold">6. Piani e pagamenti</h2>
            <p className="text-muted-foreground">
              Alcune funzionalità richiedono un abbonamento. I pagamenti sono non 
              rimborsabili salvo diversa indicazione. Puoi annullare l&apos;abbonamento 
              in qualsiasi momento dalle impostazioni del tuo account.
            </p>

            <h2 className="text-xl font-semibold">7. Proprietà intellettuale</h2>
            <p className="text-muted-foreground">
              TaskWave e tutti i suoi componenti sono protetti da copyright e altri 
              diritti di proprietà intellettuale. Non puoi copiare, modificare o 
              distribuire il servizio senza autorizzazione scritta.
            </p>

            <h2 className="text-xl font-semibold">8. Privacy e dati personali</h2>
            <p className="text-muted-foreground">
              L&apos;utilizzo del servizio è regolato dalla nostra{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              Puoi esercitare i diritti GDPR (accesso, export, cancellazione, opt-out IP) dalle
              impostazioni account o dalla pagina{' '}
              <a href="/privacy/opt-out" className="text-primary hover:underline">Opt-out IP</a>.
            </p>

            <h2 className="text-xl font-semibold">9. Disclaimer</h2>
            <p className="text-muted-foreground">
              IL SERVIZIO È FORNITO &quot;COSÌ COM&apos;È&quot; SENZA GARANZIE DI ALCUN TIPO. 
              NON GARANTIAMO CHE IL SERVIZIO SIA PRIVO DI ERRORI O VIRUS.
            </p>

            <h2 className="text-xl font-semibold">10. Limitazione di responsabilità</h2>
            <p className="text-muted-foreground">
              NON SAREMO RESPONSABILI PER DANNI INDIRETTI, INCIDENTALI, SPECIALI 
              O CONSEQUENZIALI DERIVANTI DALL&apos;UTILIZZO DEL SERVIZIO.
            </p>

            <h2 className="text-xl font-semibold">11. Indennizzo</h2>
            <p className="text-muted-foreground">
              Accetti di indennizzare e tenere indenne TaskWave da qualsiasi 
              rivendicazione derivante dalla tua violazione di questi termini.
            </p>

            <h2 className="text-xl font-semibold">12. Risoluzione</h2>
            <p className="text-muted-foreground">
              Possiamo sospendere o terminare il tuo account in caso di violazione 
              di questi termini. Puoi eliminare il tuo account in qualsiasi momento.
            </p>

            <h2 className="text-xl font-semibold">13. Legge applicabile</h2>
            <p className="text-muted-foreground">
              Questi termini sono regolati dalla legge italiana. Per qualsiasi 
              controversia sarà competente il Foro di Milano.
            </p>

            <h2 className="text-xl font-semibold">14. Modifiche</h2>
            <p className="text-muted-foreground">
              Possiamo modificare questi termini in qualsiasi momento. L&apos;uso 
              continuato del servizio dopo le modifiche costituisce accettazione 
              dei nuovi termini.
            </p>

            <h2 className="text-xl font-semibold">15. Contatti</h2>
            <p className="text-muted-foreground">
              Per domande su questi termini, contattaci a: 
              <strong> legal@taskwave.app</strong>
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
