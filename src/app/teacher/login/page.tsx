'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setCookie } from 'cookies-next';
import { getTeacherAccessCode } from '@/lib/supabase';

export default function TeacherLoginPage() {
  const [teacherName, setTeacherName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!teacherName.trim()) {
      setError('Lütfen adınızı girin');
      return;
    }
    
    if (!accessCode) {
      setError('Lütfen öğretmen giriş kodunu girin');
      return;
    }
    
    setLoading(true);
    
    try {
      // Geçerli giriş kodunu al
      const validCode = await getTeacherAccessCode();
      
      // Kod kontrolü
      if (accessCode !== validCode) {
        setError('Geçersiz öğretmen giriş kodu');
        setLoading(false);
        return;
      }
      
      // Başarılı giriş
      const loginTime = new Date().toISOString();
      const teacherData = {
        name: teacherName,
        role: 'teacher',
        loginTime
      };
      
      // Local Storage'a kaydet (istemci tarafında erişim için)
      if (typeof window !== 'undefined') {
        localStorage.setItem('teacherUser', JSON.stringify(teacherData));
      }
      
      // Cookie'ye kaydet (middleware için)
      setCookie('teacher-session', JSON.stringify(teacherData), {
        maxAge: 60 * 60 * 8, // 8 saat
        path: '/',
      });
      
      // Yönlendirme
      router.push('/teacher/issues');
    } catch (err) {
      console.error('Giriş sırasında hata:', err);
      setError('Giriş yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Öğretmen Arıza Bildirim Sistemi
        </h1>
        
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="teacherName" className="block text-gray-700 font-medium mb-2">
              Öğretmen Adı
            </label>
            <input
              id="teacherName"
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-4 py-2 border rounded-md bg-white text-gray-800 border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Adınız ve Soyadınız"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="accessCode" className="block text-gray-700 font-medium mb-2">
              Öğretmen Giriş Kodu
            </label>
            <input
              id="accessCode"
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-4 py-2 border rounded-md bg-white text-gray-800 border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Giriş Kodu"
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
        
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
            Yönetici girişi için tıklayın
          </Link>
        </div>
      </div>
    </div>
  );
} 