import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { PwaRegister } from "@/components/pwa-register";
import { CookieConsentWrapper } from "@/components/privacy/cookie-consent-wrapper";
import { BRAND_NAME, APP_URL } from "@/lib/brand";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: `${BRAND_NAME} — Task Management for Development Teams`,
  description:
    "Manage your team at the speed of thought. Fluid Kanban board with real-time updates for startups and technical teams.",
  keywords: ["task management", "kanban", "team collaboration", "project management", "startup"],
  authors: [{ name: BRAND_NAME }],
  manifest: "/manifest.json",
  openGraph: {
    title: `${BRAND_NAME} — Task Management for Development Teams`,
    description:
      "Manage your team at the speed of thought. Fluid Kanban board with real-time updates.",
    type: "website",
    locale: "en_US",
    siteName: BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: "Task management for development teams",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <I18nProvider locale={locale}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </I18nProvider>
        <PwaRegister />
        <CookieConsentWrapper />
        <Toaster />
      </body>
    </html>
  );
}
