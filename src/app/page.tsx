'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-4">
          <Image 
            src="/okullogo.png" 
            alt="Okul Logosu" 
            width={120} 
            height={120} 
            className="mb-4"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">
          Hüsniye Özdilek Ticaret M.T.A.L.
        </h1>
        
        <h2 className="text-xl font-semibold text-center mb-6">
          Arıza Takip Sistemi
        </h2>
        
        <div className="space-y-4">
          <Link 
            href="/login" 
            className="flex items-center justify-center w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Yönetici Girişi
          </Link>
          
          <Link 
            href="/teacher/login" 
            className="flex items-center justify-center w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Öğretmen Girişi
          </Link>
        </div>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Bilişim Teknolojileri Alanı Teknik Destek</p>
          <p>© {new Date().getFullYear()} Tüm hakları saklıdır</p>
        </div>
      </div>
    </div>
  );
}

