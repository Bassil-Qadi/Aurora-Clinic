import type { Metadata } from "next";
import AuthProvider from "../components/AuthProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { I18nProvider } from "../lib/i18n";
import { Toaster } from "../components/ui/toaster";
import "../styles/globals.css";

const SITE_DESCRIPTION =
  "Clinic management for bilingual practices — appointments, patient records, " +
  "prescriptions, WhatsApp reminders and video consultations, in Arabic and English.";

export const metadata: Metadata = {
  title: {
    default: "Aurora Clinic — Clinic Management System",
    template: "%s · Aurora Clinic",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "clinic management",
    "clinic software",
    "patient portal",
    "appointment scheduling",
    "نظام إدارة العيادات",
    "برنامج عيادات",
  ],
  openGraph: {
    type: "website",
    title: "Aurora Clinic — Clinic Management System",
    description: SITE_DESCRIPTION,
    siteName: "Aurora Clinic",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurora Clinic — Clinic Management System",
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="app-shell">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
