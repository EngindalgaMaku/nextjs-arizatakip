'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100 overflow-hidden">
      <div className="w-full max-w-md px-6 py-5 bg-white rounded-lg shadow-md mx-4">
        <div className="flex justify-center">
          <Image 
            src="/okullogo.png" 
            alt="Okul Logosu" 
            width={100} 
            height={100} 
            className="mb-2"
            priority
          />
        </div>
        
        <h1 className="text-xl font-bold text-center mb-2">
          Hüsniye Özdilek Ticaret M.T.A.L.
        </h1>
        
        <h2 className="text-lg font-semibold text-center mb-4">
          Arıza Takip Sistemi
        </h2>
        
        <div className="space-y-3">
          <Link 
            href="/login" 
            className="flex items-center justify-center w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <UserIcon className="w-5 h-5 mr-2" />
            Yönetici Girişi
          </Link>
          
          <Link 
            href="/teacher/login" 
            className="flex items-center justify-center w-full py-2.5 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <AcademicCapIcon className="w-5 h-5 mr-2" />
            Öğretmen Girişi
          </Link>
        </div>
        
        <div className="mt-4 text-center text-gray-500 text-xs">
          <p>Bilişim Teknolojileri Alanı Teknik Destek</p>
          <p>© {new Date().getFullYear()} Tüm hakları saklıdır</p>
        </div>
      </div>
    </div>
  );
}

