'use client';

import React from 'react';
import Link from 'next/link';
import { getTests } from '@/data/tests';
import { ClockIcon, AcademicCapIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function TestsPage() {
  const tests = getTests();
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Testler</h1>
          <p className="text-gray-600">Bilgilerinizi test edin ve seviyenizi ölçün.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map(test => (
          <div key={test.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">{test.title}</h2>
              <p className="text-gray-600 mb-4 text-sm line-clamp-3">{test.description}</p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-gray-500 text-sm">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  <span>{test.timeLimit || 60} dakika</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm">
                  <AcademicCapIcon className="w-4 h-4 mr-1" />
                  <span>{test.questions.length} soru</span>
                </div>
              </div>
              
              <Link 
                href={`/dashboard/tests/${test.slug}`} 
                className="block w-full text-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
              >
                Teste Başla
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {tests.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Henüz test bulunmuyor</h2>
          <p className="text-gray-600 mb-4">Daha sonra tekrar kontrol edin.</p>
        </div>
      )}
    </div>
  );
} 