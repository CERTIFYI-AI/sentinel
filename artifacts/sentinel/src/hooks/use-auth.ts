/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * useAuth — thin wrapper over the Zustand auth store + Supabase auth
 * state listener.
 *
 * For tenant context, callers MUST use `useTenant()` from
 * `../hooks/useTenant`. The legacy `tenant` field exposed by
 * `useRequireAuth` is preserved temporarily for backwards
 * compatibility while call-sites migrate; new code must not read it.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useTenant } from './useTenant';

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
  const { user, isAuthenticated } = useAuth();
  const { orgId } = useTenant();
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
  }
  return { user, tenant: orgId ?? undefined };
}
