"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authService from "../lib/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking the session, null = signed out, object = signed in
  const [user, setUser] = useState(undefined);

  const refresh = useCallback(async () => {
    const result = await authService.getSession();
    setUser(result.ok ? result.data?.user ?? null : null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await authService.signout();
    setUser(null);
  }, []);

  const value = { user, loading: user === undefined, refresh, setUser, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
