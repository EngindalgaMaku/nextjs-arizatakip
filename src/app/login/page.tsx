'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, demoSignIn } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Demo modunu kontrol edecek değişken (Supabase kurulumu yoksa true yapın)
  const DEMO_MODE = true;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Lütfen email ve şifre giriniz');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (DEMO_MODE) {
        // Demo mod giriş işlemi
        const { success, error } = await demoSignIn(email, password);
        
        if (!success) {
          throw new Error(error);
        }
        
        // Demo giriş başarılı ise dashboard'a yönlendir
        router.push('/dashboard');
      } else {
        // Supabase giriş işlemi
        const { data, error } = await signIn(email, password);
        
        if (error) {
          throw error;
        }
        
        if (data.user) {
          // Başarıyla giriş yapıldığında dashboard'a yönlendir
          router.push('/dashboard');
          router.refresh(); // Session'ı güncellemek için
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
          setError('Giriş yapılırken bir hata oluştu: ' + err.message);
        }
      } else {
        setError('Giriş yapılırken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  }
  
  // Demo kullanıcı bilgilerini göster
  const showDemo = () => {
    alert("Demo Kullanıcılar:\n\nAdmin: admin@example.com / admin123\nEditör: editor@example.com / editor123");
  };

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
        
        {DEMO_MODE && (
          <div className="mt-4">
            <button 
              onClick={showDemo}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
            >
              Demo kullanıcı bilgilerini göster
            </button>
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Link 
            href="/" 
            className="block text-center text-sm text-gray-600 hover:text-gray-800"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
} 