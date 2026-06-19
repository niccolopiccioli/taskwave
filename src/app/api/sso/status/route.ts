import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    sso: {
      available: false,
      provider: 'saml',
      plan: 'business',
      message:
        'SSO / SAML è disponibile sul piano Business. Contattaci per configurare il tuo identity provider.',
      setupSteps: [
        'Passa al piano Business',
        'Fornisci metadata SAML del tuo IdP (Okta, Azure AD, Google Workspace)',
        'Configuriamo Supabase Auth SAML per il tuo dominio',
        'Gli utenti accedono con "Sign in with SSO"',
      ],
      contact: 'hello@taskwave.app',
    },
  });
}
