import "./globals.css";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import ClientLayout from "./ClientLayout";
import { headers } from "next/headers";

export const metadata = {
  title: "Dashboard",
  description: "Payment calculation and dashboard",
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only_12345"
);

export default async function RootLayout({ children }) {
  let role = null;
  let permissions = null;
  let isValid = false;

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  try {
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isValid = true;
      if (payload.role) role = payload.role;
      if (payload.permissions) permissions = payload.permissions;
    }
  } catch (e) {}

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientLayout userRole={role} userPermissions={permissions} isValid={isValid}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}

