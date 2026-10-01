import type { Locale } from './types';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'tw_locale';

const SUPPORTED = new Set<Locale>(['en', 'es', 'fr', 'it']);

export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const prefs = acceptLanguage
    .split(',')
    .map((part) => {
      const [langRaw, ...params] = part.trim().split(';');
      const lang = langRaw.toLowerCase().split('-')[0];
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const weight = qParam ? parseFloat(qParam.split('=')[1]) : 1;
      return { lang, weight: Number.isFinite(weight) ? weight : 1 };
    })
    .sort((a, b) => b.weight - a.weight);

  for (const { lang } of prefs) {
    if (SUPPORTED.has(lang as Locale)) return lang as Locale;
  }

  return DEFAULT_LOCALE;
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && SUPPORTED.has(value as Locale);
}
