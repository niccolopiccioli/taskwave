'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getMessages, type Locale, type Messages } from '@/lib/i18n';

const I18nContext = createContext<{ locale: Locale; messages: Messages }>({
  locale: 'en',
  messages: getMessages('en'),
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, messages: getMessages(locale) }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).messages;
}
