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
    <html lang="en-US">
      <body>{children}</body>
    </html>
  );
}
