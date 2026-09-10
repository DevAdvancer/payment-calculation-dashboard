import "./globals.css";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const metadata = {
  title: "Placement Management System",
  description: "Payment dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import ClientLayout from "./ClientLayout";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only_12345"
);

export default async function RootLayout({ children }) {
  let role = "user";
  let permissions = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.role) role = payload.role;
      if (payload.permissions) permissions = payload.permissions;
    }
  } catch (e) {}

  return (
    <html lang="en-US" suppressHydrationWarning>
      <body>
        <ClientLayout userRole={role} userPermissions={permissions}>{children}</ClientLayout>
      </body>
    </html>
  );
}
