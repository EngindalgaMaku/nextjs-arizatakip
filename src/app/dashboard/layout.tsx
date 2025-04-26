'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { signOut, loadUserData } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  
  // Path adını kontrol ederek başlık oluştur
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.includes("/issues")) return "Arıza Takip";
    if (pathname.includes("/users")) return "Kullanıcılar";
    if (pathname.includes("/reports")) return "Raporlar";
    if (pathname.includes("/settings")) return "Ayarlar";
    return "Dashboard";
  };

  // Ekran boyutu değişikliğini izle
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // İlk yükleme için çalıştır
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sayfa değiştiğinde mobil menüyü kapat
  useEffect(() => {
    if (windowWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname, windowWidth]);

  // Profil menüsü dışında bir yere tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function getUserData() {
      try {
        const data = await loadUserData();
        setUserData(data);
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    }

    getUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear localStorage and cookies
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminUser');
      }
      
      // Clear cookies using import
      const { deleteCookie } = await import('cookies-next');
      deleteCookie('admin-session');
      
      // Call Supabase signOut
      await signOut();
      
      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Mobil ekranda overlay'e tıklandığında sidebar'ı kapat
  const handleOverlayClick = () => {
    if (windowWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobil Overlay - sidebar açıkken arka planı karartır */}
      {isSidebarOpen && windowWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10" 
          onClick={handleOverlayClick}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-72 bg-blue-800 shadow-lg transform transition-transform duration-300 ease-in-out z-20 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:w-72`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 border-b border-blue-700">
            <h1 className="text-2xl font-bold text-white">ATSİS</h1>
            <p className="text-sm text-blue-200"></p>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                pathname === "/dashboard"
                  ? "bg-blue-700 text-white"
                  : "text-gray-100 hover:bg-blue-700 hover:text-white"
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Gösterge Paneli
            </Link>

            <Link
              href="/dashboard/issues"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                pathname.includes("/issues")
                  ? "bg-blue-700 text-white"
                  : "text-gray-100 hover:bg-blue-700 hover:text-white"
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Arızalar
            </Link>

            <Link
              href="/dashboard/users"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                pathname.includes("/users")
                  ? "bg-blue-700 text-white"
                  : "text-gray-100 hover:bg-blue-700 hover:text-white"
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Kullanıcılar
            </Link>

            <Link
              href="/dashboard/reports"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                pathname.includes("/reports")
                  ? "bg-blue-700 text-white"
                  : "text-gray-100 hover:bg-blue-700 hover:text-white"
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Raporlar
            </Link>

            <Link
              href="/dashboard/settings"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                pathname.includes("/settings")
                  ? "bg-blue-700 text-white"
                  : "text-gray-100 hover:bg-blue-700 hover:text-white"
              }`}
            >
              <svg
                className="mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Ayarlar
            </Link>
          </nav>
          
          {/* Mobile Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="md:hidden my-2 mx-4 flex items-center px-4 py-3 text-sm font-medium rounded-md text-white hover:bg-red-600 transition-colors"
          >
            <LogOutIcon className="mr-3 h-5 w-5" />
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center">
            {/* Hamburger menu for mobile */}
            <button
              className="md:hidden mr-3 p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            
            {/* Current Page Title */}
            <h1 className="text-lg font-semibold text-gray-700">{getPageTitle()}</h1>
          </div>
          
          {/* Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                // Mobilde profil menüsü açıldığında sidebar'ı kapat
                if (windowWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
            >
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-800 font-medium">
                  {userData?.name ? userData.name.charAt(0) : "U"}
                </span>
              </div>
              <div className="hidden md:flex md:items-center">
                <span className="text-sm font-medium text-gray-700">
                  {loading ? "Yükleniyor..." : userData?.name || "Kullanıcı"}
                </span>
                <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-500" />
              </div>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {userData?.name || "Kullanıcı"}
                  </p>
                  <p className="text-xs text-gray-500">{userData?.email || ""}</p>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Profil
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Ayarlar
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                >
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 ml-0 md:ml-72">
          {children}
        </main>
      </div>
    </div>
  );
} 