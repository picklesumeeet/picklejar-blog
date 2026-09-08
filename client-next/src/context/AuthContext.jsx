"use client";

import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export const AuthContext = createContext();

async function fetchProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('fetchProfile:', error);
    return null;
  }
  return data;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const hydrateFromAuthUser = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      return;
    }
    const profile = await fetchProfile(supabase, authUser.id);
    setUser({
      id: authUser.id,
      email: authUser.email,
      name: profile?.name ?? authUser.email,
      role: profile?.role ?? 'editor',
    });
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (cancelled) return;
      await hydrateFromAuthUser(authUser);
      setIsLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await hydrateFromAuthUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [supabase, hydrateFromAuthUser]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will also fire, but hydrate synchronously so the
    // caller's next line (router.replace) sees a populated user.
    await hydrateFromAuthUser(data.user);
    return { success: true };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('signOut:', err);
    } finally {
      setUser(null);
      window.location.href = '/admin/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
