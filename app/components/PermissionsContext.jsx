"use client";
import { createContext, useContext } from "react";

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
