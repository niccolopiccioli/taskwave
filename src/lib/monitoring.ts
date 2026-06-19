type SentryPayload = {
  message: string;
  level?: 'error' | 'warning' | 'info';
  extra?: Record<string, unknown>;
};

function randomEventId() {
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, '0').slice(0, 32);
}

function parseSentryDsn(dsn: string) {
  const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
  if (!match) return null;
  return { publicKey: match[1], host: match[2], projectId: match[3] };
}

export async function captureException(error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[TaskWave]', message, extra ?? '');

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return;

  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const payload: SentryPayload = {
    message,
    level: 'error',
    extra: {
      ...extra,
      stack: error instanceof Error ? error.stack : undefined,
    },
  };

  try {
    await fetch(`https://${parsed.host}/api/${parsed.projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=taskwave/1.0, sentry_key=${parsed.publicKey}`,
      },
      body: JSON.stringify({
        event_id: randomEventId(),
        timestamp: new Date().toISOString(),
        platform: 'javascript',
        level: payload.level,
        message: { formatted: payload.message },
        extra: payload.extra,
      }),
    });
  } catch {
    // non-blocking telemetry
  }
}
