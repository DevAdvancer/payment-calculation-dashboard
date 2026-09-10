"use client";
import { createContext, useContext, useMemo } from "react";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ permissions, children }) {
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function useLockedEntries(entries, pageId) {
  const permissions = usePermissions();
  
  return useMemo(() => {
    if (!permissions || !permissions.pages) return entries;
    const p = permissions.pages[pageId];
    if (!p || !p.lockedFilters) return entries;
    
    let filtered = entries;
    for (const [key, val] of Object.entries(p.lockedFilters)) {
      if (!val) continue;
      filtered = filtered.filter(e => {
        // e[key] might be null/undefined, safely convert to string
        const entryVal = String(e[key] || '').toLowerCase().trim();
        
        if (Array.isArray(val)) {
          if (val.length === 0) return true;
          return val.some(v => entryVal.includes(String(v).toLowerCase().trim()));
        } else {
          const lockVal = String(val).toLowerCase().trim();
          return entryVal.includes(lockVal);
        }

      });
    }
    return filtered;
  }, [entries, permissions, pageId]);
}

export function useFilterAccess(pageId) {
  const permissions = usePermissions();
  return (filterId) => {
    if (!permissions || !permissions.pages) return true;
    const p = permissions.pages[pageId];
    if (!p) return false;
    
    if (p.lockedFilters && p.lockedFilters[filterId]) {
      const lockedVal = p.lockedFilters[filterId];
      if (typeof lockedVal === "string" || (Array.isArray(lockedVal) && lockedVal.length <= 1)) {
        return false;
      }
    }
    
    return Array.isArray(p.filters) ? p.filters.includes(filterId) : true;
  };
}

export function usePageMode(pageId) {
  const permissions = usePermissions();
  if (!permissions || !permissions.pages) return "write";
  const p = permissions.pages[pageId];
  if (!p) return "write";
  return p.mode === "read" ? "read" : "write";
}
