'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon,
  AcademicCapIcon,
  UserIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { path: "/dashboard", label: "Anasayfa", icon: <HomeIcon className="w-5 h-5" /> },
    { path: "/dashboard/tests", label: "Testler", icon: <AcademicCapIcon className="w-5 h-5" /> },
    { path: "/dashboard/profile", label: "Profil", icon: <UserIcon className="w-5 h-5" /> },
    { path: "/dashboard/settings", label: "Ayarlar", icon: <Cog6ToothIcon className="w-5 h-5" /> },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-800 bg-opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-6 border-b">
            <h1 className="text-2xl font-bold text-indigo-600">Test Platformu</h1>
            <p className="text-sm text-gray-500">Bilgi seviyenizi ölçün</p>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md group transition-colors ${
                  pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path))
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                <span className={`mr-3 ${
                  pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path))
                    ? "text-indigo-700"
                    : "text-gray-500 group-hover:text-indigo-700"
                }`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t text-sm text-gray-500">
            <p>© 2023 Test Platformu</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navigation */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b md:py-4">
          <button
            onClick={toggleSidebar}
            className="p-1 text-gray-700 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {isSidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>

          <div className="ml-4 md:ml-0">
            <h2 className="text-lg font-medium text-gray-800">
              {pathname === "/dashboard" && "Anasayfa"}
              {pathname.startsWith("/dashboard/tests") && "Testler"}
              {pathname === "/dashboard/profile" && "Profil"}
              {pathname === "/dashboard/settings" && "Ayarlar"}
            </h2>
          </div>

          <div className="flex items-center">
            <button className="flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600">
              <UserIcon className="w-5 h-5 mr-1" />
              <span>Kullanıcı</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 