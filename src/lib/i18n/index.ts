import type { Locale, Messages } from './types';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { it } from './locales/it';

const catalogs: Record<Locale, Messages> = { en, es, fr, it };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? en;
}

export type { Locale, Messages };
export { detectLocale, isLocale, DEFAULT_LOCALE, LOCALE_COOKIE } from './detect';
