// @ts-nocheck
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const { token, user, isAuthenticated, login, logout, initializeAuth, setSession } = useAuthStore();

  useEffect(() => {
    initializeAuth();

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [initializeAuth, setSession]);

  const loginFn = async (email: string, password: string) => {
    await login(email, password);
  };

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
