import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { CookieConsentWrapper } from "@/components/privacy/cookie-consent-wrapper";
import { BRAND_NAME, APP_URL } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: `${BRAND_NAME} — Task Management per Team di Sviluppo`,
  description:
    "Gestisci il tuo team alla velocità del pensiero. Kanban board fluido con aggiornamenti real-time per startup e team tecnici.",
  keywords: ["task management", "kanban", "team collaboration", "project management", "startup"],
  authors: [{ name: BRAND_NAME }],
  manifest: "/manifest.json",
  openGraph: {
    title: `${BRAND_NAME} — Task Management per Team di Sviluppo`,
    description:
      "Gestisci il tuo team alla velocità del pensiero. Kanban board fluido con aggiornamenti real-time.",
    type: "website",
    locale: "it_IT",
    siteName: BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: "Task Management per team di sviluppo",
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
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <PwaRegister />
        <CookieConsentWrapper />
        <Toaster />
      </body>
    </html>
  );
}
