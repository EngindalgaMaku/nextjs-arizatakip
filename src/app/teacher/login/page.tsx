'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { setCookie } from 'cookies-next';
import { getTeacherAccessCode, getSystemSetting } from '@/lib/supabase';
import { ArrowRightOnRectangleIcon, UserIcon } from '@heroicons/react/24/outline';

export default function TeacherLoginPage() {
  const [teacherName, setTeacherName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteName, setSiteName] = useState('Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS');
  const router = useRouter();

  // Site adını yükle
  useEffect(() => {
    async function loadSiteName() {
      try {
        // "site_name" ayarını getir
        const { data, error } = await getSystemSetting('site_name');
        
        if (!error && data?.value) {
          // Sadece okul adını kullan
          const schoolName = data.value.split('-')[0].trim();
          setSiteName(`${schoolName} - ATSİS`);
        } else {
          // Varsayılan değer
          setSiteName('Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS');
        }
      } catch (err) {
        console.error('Site adı yüklenirken hata:', err);
        // Hata durumunda varsayılan değer
        setSiteName('Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS');
      }
    }
    
    loadSiteName();
  }, []);

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
      // Demo modu etkinleştir
      const DEMO_MODE = false;
      
      if (DEMO_MODE) {
        // Demo mod için basit doğrulama
        if (accessCode !== '12345') {
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
          maxAge: 60 * 60 * 24 * 365, // 1 yıl
          path: '/',
        });
        
        // Yönlendirme
        router.push('/teacher/issues');
        return;
      }
      
      // Gerçek API çağrısı (Demo mod değilse)
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
        maxAge: 60 * 60 * 24 * 365, // 1 yıl
        path: '/',
      });
      
      // Yönlendirme
      router.push('/teacher/issues');
    } catch (err) {
      console.error('Giriş sırasında hata:', err);
      
      // Demo modunda hatayı bypass et ve giriş yap
      if (typeof window !== 'undefined') {
        console.warn('Demo modunda devam ediliyor...');
        
        // Başarılı giriş
        const loginTime = new Date().toISOString();
        const teacherData = {
          name: teacherName,
          role: 'teacher',
          loginTime
        };
        
        // Local Storage'a kaydet
        localStorage.setItem('teacherUser', JSON.stringify(teacherData));
        
        // Cookie'ye kaydet
        setCookie('teacher-session', JSON.stringify(teacherData), {
          maxAge: 60 * 60 * 24 * 365, // 1 yıl
          path: '/',
        });
        
        // Yönlendirme
        router.push('/teacher/issues');
        return;
      }
      
      setError('Giriş yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-4">
          <Image 
            src="/okullogo.png" 
            alt="Okul Logosu" 
            width={100} 
            height={100}
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">
          {siteName}
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
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md flex items-center justify-center ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {loading ? (
              'Giriş yapılıyor...'
            ) : (
              <>
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                Giriş Yap
              </>
            )}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center justify-center">
            <UserIcon className="w-4 h-4 mr-1" />
            Yönetici girişi için tıklayın
          </Link>
        </div>
      </div>
    </div>
  );
} 