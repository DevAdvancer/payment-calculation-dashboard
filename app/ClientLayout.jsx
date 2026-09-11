"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useDashboardStore from "../lib/use-store";
import Sidebar from "./components/Sidebar";
import ProgressLoader from "./components/ProgressLoader";
import Toast from "./components/Toast";


import { PermissionsProvider } from "./components/PermissionsContext";

export default function ClientLayout({ children, userRole, userPermissions, isValid }) {
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
    if (loadedRef.current || pathname === '/sign-in') return;
    loadedRef.current = true;
    loadFromDB();
  }, [loadFromDB]);

  

  

  const isSignIn = pathname === "/sign-in";
  const isNotFound = pathname === "/page-not-found";
  const hideSidebar = isSignIn || isNotFound;
  const router = useRouter();
  
  // Determine if redirection is needed
  const protectedPages = ['dashboard', 'payment', 'monthly', 'defaulter', 'history', 'expenses', 'placement', 'laidoff', 'po-details', 'notifications'];
  const segment = pathname.split('/')[1];
  
  let needsRedirect = null;
  
  if (!isValid && pathname !== "/sign-in" && pathname !== "/page-not-found") {
    needsRedirect = "/sign-in";
  } else if (isValid && (pathname === "/sign-in" || pathname === "/")) {
    let dest = "/page-not-found";
    
    if (currentRole === 'admin') {
      dest = "/dashboard";
    } else if (currentPerms?.pages) {
      // Find the absolute first page they are granted access to
      const allowed = Object.entries(currentPerms.pages).find(([_, data]) => data.access === true);
      if (allowed) {
        dest = `/${allowed[0]}`;
      }
    } else {
      // Fallback for legacy users with no explicitly set permissions object
      dest = "/dashboard";
    }
    
    // Only set needsRedirect if we actually need to bounce them
    if (pathname !== dest) {
      needsRedirect = dest;
    }
  } else if (pathname.startsWith('/admin') && currentRole !== 'admin') {
    needsRedirect = "/dashboard";
  } else if (protectedPages.includes(segment) && currentPerms?.pages) {
    const pagePerm = currentPerms.pages[segment];
    if (!pagePerm || !pagePerm.access) {
      needsRedirect = "/page-not-found";
    }
  }

  useEffect(() => {
    if (needsRedirect) {
      router.replace(needsRedirect);
    }
  }, [needsRedirect, router]);

  // Prevent flash of unauthorized content while effect triggers
  if (needsRedirect) {
    return null; // or a generic spinner if needed
  }

  return (
    <PermissionsProvider permissions={currentPerms}>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
        <ProgressLoader active={loading && !isSignIn} offsetX={hideSidebar ? 0 : 220} />
        {!hideSidebar && <Sidebar userRole={currentRole} userPermissions={currentPerms} />}
        <main style={{ marginLeft: hideSidebar ? 0 : 220, flex:1, background:"var(--color-bg)", overflowY:"auto", height:"100vh" }}>
          {children}
        </main>
        <Toast />
      </div>
    </PermissionsProvider>
  );
}












