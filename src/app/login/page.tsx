'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/supabase';
import { setCookie } from 'cookies-next';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Demo modunu kontrol edecek değişken (Supabase kurulumu yoksa true yapın)
  const DEMO_MODE = false;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Lütfen email ve şifre giriniz');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Giriş deneniyor:', email);
      
      if (DEMO_MODE) {
        // Demo giriş - sadece test için
        if (email === 'admin@example.com' && password === 'admin123') {
          const loginTime = new Date().toISOString();
          const userData = {
            email,
            name: 'Demo Admin',
            role: 'admin',
            loginTime
          };
          
          localStorage.setItem('adminUser', JSON.stringify(userData));
          setCookie('admin-session', JSON.stringify(userData), {
            maxAge: 60 * 60 * 8, // 8 saat
            path: '/',
          });
          
          router.push('/dashboard');
        } else {
          setError('Demo modunda geçersiz kimlik bilgileri. admin@example.com / admin123 kullanın.');
        }
      } else {
        // Supabase giriş işlemi
        const { data, error } = await signIn(email, password);
        
        console.log('Supabase cevabı:', { data, error });
        
        if (error) {
          throw error;
        }
        
        if (data?.user) {
          // Kullanıcı doğrulandı, oturum bilgilerini kaydet
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email,
            role: data.user.user_metadata?.role || 'admin',
            loginTime: new Date().toISOString()
          };
          
          // localStorage'a kaydet
          localStorage.setItem('adminUser', JSON.stringify(userData));
          
          // Cookie'ye kaydet
          setCookie('admin-session', JSON.stringify({
            id: userData.id,
            email: userData.email,
            role: userData.role
          }), {
            maxAge: 60 * 60 * 8, // 8 saat
            path: '/',
          });
          
          // Yönlendirme
          router.push('/dashboard');
        } else {
          throw new Error('Kullanıcı bilgileri alınamadı');
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      
      // Türkçe hata mesajları
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Geçersiz email veya şifre');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Email adresi onaylanmamış');
        } else {
          setError(`Giriş yapılırken bir hata oluştu: ${err.message}`);
        }
      } else {
        setError('Giriş yapılırken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Hüsniye Özdilek Bilişim Alanı Şeflik Yönetici Paneli
        </h1>
        
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email adresiniz"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şifreniz"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <Link 
            href="/" 
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
} 