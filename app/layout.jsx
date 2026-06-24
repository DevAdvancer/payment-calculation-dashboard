import "./globals.css";

export const metadata = {
  title: "Placement Management System",
  description: "Payment dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    /* suppressHydrationWarning on <html> — browser extensions
       (Scribe recorder, ColorZilla, etc.) inject attributes like
       data-scribe-recorder-ready before React hydrates, which would
       otherwise show up as a hydration mismatch. The <body> tag
       continues to be reconciled normally. */
    <html lang="en-US" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
