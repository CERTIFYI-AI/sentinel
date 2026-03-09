// src/context/AuthContext.tsx
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setToken, clearToken, getToken, login as apiLogin, register as apiRegister } from "@/api/client";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  tenant_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: !!getToken(),
    isLoading: true,
  });

  useEffect(() => {
    const token = getToken();
    if (token) {
      // In production, validate token with backend
      // For now, mark as authenticated if token exists
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: true }));
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await apiLogin({ email, password });
      setToken(res.access_token);
      setState({
        user: { id: "1", email, name: email.split("@")[0], role: "admin", tenant_id: "default" },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await apiRegister({ name, email, password });
      setToken(res.access_token);
      setState({
        user: { id: "1", email, name, role: "admin", tenant_id: "default" },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
