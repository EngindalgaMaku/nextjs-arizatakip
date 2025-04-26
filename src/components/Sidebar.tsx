'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  ExclamationCircleIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem = ({ href, icon, label, active }: NavItemProps) => (
  <Link
    href={href}
    className={`flex items-center px-4 py-3 ${
      active 
        ? 'bg-blue-700 text-white' 
        : 'text-gray-100 hover:bg-blue-700'
    } rounded-md transition-colors`}
  >
    <span className="mr-3 w-6 h-6">{icon}</span>
    {label}
  </Link>
);

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <div className="fixed top-0 left-0 bottom-0 w-64 bg-blue-800 overflow-y-auto p-4">
      <div className="mb-8">
        <h1 className="text-white font-bold text-xl">ATSİS</h1>
        <p className="text-blue-200 text-sm">Arıza Takip Sistemi</p>
      </div>
      
      <nav className="space-y-2">
        <NavItem 
          href="/dashboard" 
          icon={<HomeIcon />} 
          label="Gösterge Paneli"
          active={pathname === '/dashboard'} 
        />
        
        <NavItem 
          href="/dashboard/issues" 
          icon={<ExclamationCircleIcon />} 
          label="Arızalar"
          active={pathname.startsWith('/dashboard/issues')} 
        />
        
        <NavItem 
          href="/dashboard/users" 
          icon={<UserGroupIcon />} 
          label="Kullanıcılar"
          active={pathname.startsWith('/dashboard/users')} 
        />
        
        <NavItem 
          href="/dashboard/reports" 
          icon={<DocumentTextIcon />} 
          label="Raporlar"
          active={pathname.startsWith('/dashboard/reports')} 
        />
        
        <NavItem 
          href="/dashboard/settings" 
          icon={<Cog6ToothIcon />} 
          label="Ayarlar"
          active={pathname.startsWith('/dashboard/settings')} 
        />
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/logout"
          className="flex items-center px-4 py-3 text-gray-100 hover:bg-red-600 rounded-md transition-colors"
        >
          <span className="mr-3 w-6 h-6"><ArrowLeftOnRectangleIcon /></span>
          Çıkış Yap
        </Link>
      </div>
    </div>
  );
} 