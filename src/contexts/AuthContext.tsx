'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { loadUserData } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Supabase istemcisi oluştur
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // İlk render'da kullanıcıyı yükle
  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await loadUserData();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Kullanıcı verisi yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  // Çıkış yapma fonksiyonu
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth hook must be used within an AuthProvider');
  }
  return context;
} 