import type { Metadata } from "next";
import AuthProvider from "../components/AuthProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { I18nProvider } from "../lib/i18n";
import { Toaster } from "../components/ui/toaster";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "CarePilot — Clinic Management System",
  description:
    "Modern clinic management system with appointments, patient portal, visits, and analytics.",
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
    <html lang="en" dir="ltr" suppressHydrationWarning>
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
