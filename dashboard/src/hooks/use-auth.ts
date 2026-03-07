// src/hooks/use-auth.ts
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, setToken, clearToken } from "../api/client";

function decodePayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch { return {}; }
}

export function useAuth() {
  const token = getToken();
  const user = useMemo(() => token ? decodePayload(token) : null, [token]);
  const isAuthenticated = Boolean(token);

  const loginFn = useCallback((t: string) => { setToken(t); }, []);
  const logout = useCallback(() => {
    clearToken();
    window.location.href = "/login";
  }, []);

  return { token, user, isAuthenticated, login: loginFn, logout };
}

export function useRequireAuth() {
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    navigate("/login", { replace: true });
  }
  return { user, tenant: (user as Record<string, unknown>)?.tenant as string | undefined };
}
