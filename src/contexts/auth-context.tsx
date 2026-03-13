"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import type { AuthUser, LoginResponse } from "@/types";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginResponse) => void;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): {
  userId: string;
  username: string;
  role: string;
  departmentId: string | null;
  exp: number;
} {
  const base64 = token.split(".")[1];
  const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (token: string) => {
      clearRefreshTimer();
      try {
        const { exp } = decodeJwtPayload(token);
        const delay = exp * 1000 - Date.now() - 60_000; // 1 min before expiry
        if (delay <= 0) return;

        refreshTimerRef.current = setTimeout(async () => {
          try {
            const res = await fetch("/api/v1/auth/refresh", { method: "POST" });
            if (!res.ok) return;
            const body = await res.json();
            const newToken = body.data.accessToken as string;
            setAccessToken(newToken);
            scheduleRefresh(newToken);
          } catch {
            // Refresh failed — user will be redirected on next authFetch 401
          }
        }, delay);
      } catch {
        // Token decode failed
      }
    },
    [clearRefreshTimer],
  );

  // Restore session on mount via refresh endpoint
  useEffect(() => {
    async function restore() {
      try {
        const res = await fetch("/api/v1/auth/refresh", { method: "POST" });
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const body = await res.json();
        const token = body.data.accessToken as string;
        const payload = decodeJwtPayload(token);
        setAccessToken(token);
        setUser({
          id: payload.userId,
          username: payload.username,
          firstName: payload.username, // JWT doesn't include first/last name
          lastName: "",
          role: payload.role as AuthUser["role"],
          departmentId: payload.departmentId,
        });
        scheduleRefresh(token);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    restore();
    return () => clearRefreshTimer();
  }, [router, scheduleRefresh, clearRefreshTimer]);

  const login = useCallback(
    (data: LoginResponse) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      scheduleRefresh(data.accessToken);
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch {
      // Proceed with client-side cleanup even if API call fails
    }
    setUser(null);
    setAccessToken(null);
    router.push("/login");
  }, [accessToken, router, clearRefreshTimer]);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(url, { ...options, headers });
    },
    [accessToken],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
