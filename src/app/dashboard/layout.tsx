'use client';

import { useState, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HomeIcon, UserIcon, ChartBarIcon, CogIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Yönetici');
  const schoolName = 'Hüsniye Özdilek';
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function loadUserData() {
      try {
        // DEMO: localStorage'dan kullanıcı bilgilerini al
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('demoAuthUser');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserName(user.name || user.email?.split('@')[0] || 'Yönetici');
          }
        }
        
        // Gerçek uygulamada Supabase kullanıcı verilerini al
        /*
        const user = await getCurrentUser();
        if (user) {
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Yönetici');
        }
        */
      } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Arıza Takip', href: '/dashboard/issues', icon: ComputerDesktopIcon },
    { name: 'Kullanıcılar', href: '/dashboard/users', icon: UserIcon },
    { name: 'Raporlar', href: '/dashboard/reports', icon: ChartBarIcon },
    { name: 'Ayarlar', href: '/dashboard/settings', icon: CogIcon },
  ];

  const handleSignOut = async () => {
    try {
      // DEMO: localStorage'dan kullanıcı bilgilerini temizle
      if (typeof window !== 'undefined') {
        localStorage.removeItem('demoAuthUser');
      }
      
      // Gerçek uygulamada Supabase çıkış işlemi
      // await signOut();
      
      router.push('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-30 w-64 bg-indigo-700 transition duration-300 ease-in-out transform md:translate-x-0 md:static md:inset-auto md:h-full`}
      >
        <div className="flex items-center justify-center h-16 bg-indigo-800">
          <span className="text-xl font-semibold text-white">{schoolName}</span>
        </div>
        <div className="flex items-center justify-center h-10 bg-indigo-700">
          <span className="text-base font-medium text-white">Bilişim Alanı Şeflik</span>
        </div>
        <nav className="px-2 mt-5 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-indigo-800 text-white'
                    : 'text-indigo-100 hover:bg-indigo-600'
                } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
              >
                <span className="mr-3">
                  <IconComponent className="w-6 h-6 text-indigo-300" aria-hidden="true" />
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white shadow">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              className="text-gray-500 focus:outline-none md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            <div className="flex items-center ml-auto">
              <div className="relative">
                <button 
                  className="flex items-center text-sm text-gray-500 focus:outline-none"
                  onClick={toggleProfileMenu}
                >
                  <span className="mr-2">{isLoading ? 'Yükleniyor...' : userName}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                </button>
                
                {/* Profile dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 z-10 w-48 py-1 mt-2 bg-white rounded-md shadow-lg">
                    <Link href="/dashboard/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Profil Ayarları
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 