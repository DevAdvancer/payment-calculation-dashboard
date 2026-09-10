"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import useDashboardStore from "../lib/use-store";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import CounterLoader from "./components/CounterLoader";

import { PermissionsProvider } from "./components/PermissionsContext";

export default function ClientLayout({ children, userRole, userPermissions }) {
  const loading    = useDashboardStore((s) => s.loading);
  const loadFromDB = useDashboardStore((s) => s.loadFromDB);
  const pathname   = usePathname();

  // Local state for role and permissions. 
  // We initialize them with the props from the server (extracted from the initial JWT).
  // This allows us to update the UI dynamically without a full page reload when the background fetch detects a change.
  const [currentRole, setCurrentRole] = useState(userRole);
  const [currentPerms, setCurrentPerms] = useState(userPermissions);

  // If the server props change (e.g. the user manually hard-refreshes the page), sync our local state.
  useEffect(() => {
    setCurrentRole(userRole);
    setCurrentPerms(userPermissions);
  }, [userRole, userPermissions]);

  /* Fire-once guard: prevents React Strict Mode from triggering loadFromDB a second time */
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFromDB();
  }, [loadFromDB]);

  /* 
   * SHORT-LIVED JWTs BACKGROUND REFRESH (1 MINUTE DELAY)
   * 
   * How this works:
   * 1. Every 1 minute this script silently calls `/api/auth/refresh`.
   * 2. The server checks the database for any changes to the user's role or permissions.
   * 3. The server bakes those new permissions into a fresh JWT, saving it as a cookie.
   * 4. The server returns the updated permissions to us here.
   * 5. We update `currentRole` and `currentPerms`, which instantly propagates down to 
   *    the Sidebar, the PermissionsContext, and the Filter Bars, revealing/hiding pages dynamically!
   * 
   * NOTE: If you want to change the delay, simply adjust the REFRESH_INTERVAL below.
   */
  useEffect(() => {
    // We don't need to refresh tokens if the user is on the sign-in page.
    if (pathname === "/sign-in" || pathname === "/page-not-found") return;

    const REFRESH_INTERVAL = 1 * 60 * 1000; // 1 minute in milliseconds

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Update local state with fresh data from DB, dynamically reflecting UI changes
            setCurrentRole(data.role);
            setCurrentPerms(data.permissions);
          }
        } else if (res.status === 401 || res.status === 403) {
          // If the refresh fails because the admin deleted the user or set them to inactive,
          // forcing a window reload will let the middleware kick them back to the sign-in screen.
          window.location.reload();
        }
      } catch (e) {
        console.warn("Silent background refresh failed", e);
      }
    }, REFRESH_INTERVAL);

    // Cleanup the interval if the component unmounts
    return () => clearInterval(interval);
  }, [pathname]);

  if (loading) return <CounterLoader />;

  const isSignIn = pathname === "/sign-in";
  const isNotFound = pathname === "/page-not-found";
  const hideSidebar = isSignIn || isNotFound;

  return (
    <PermissionsProvider permissions={currentPerms}>
      <div style={{ display:"flex", minHeight:"100vh" }}>
        {!hideSidebar && <Sidebar userRole={currentRole} userPermissions={currentPerms} />}
        <main style={{ marginLeft: hideSidebar ? 0 : 220, flex:1, background:"var(--color-bg)", overflowY:"auto", minHeight:"100vh" }}>
          {children}
        </main>
        <Toast />
      </div>
    </PermissionsProvider>
  );
}
