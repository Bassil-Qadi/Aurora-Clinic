import AuthProvider from "../components/AuthProvider";
import "../styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-shell">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
