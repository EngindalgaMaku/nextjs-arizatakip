'use client';

import React from 'react';
import Link from 'next/link';
import { getTests } from '@/data/tests';
import { AcademicCapIcon, ClockIcon, DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const tests = getTests();
  const totalTests = tests.length;
  const totalQuestions = tests.reduce((sum, test) => sum + test.questions.length, 0);
  
  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Hoş Geldiniz</h1>
        <p className="text-gray-600">
          Bu platformda farklı konulara ait testleri çözebilir, bilgi seviyenizi ölçebilirsiniz.
          Test sonuçlarınızı görebilir ve eksik olduğunuz konuları tespit edebilirsiniz.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-indigo-50 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
              <AcademicCapIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-800">{totalTests}</h2>
              <p className="text-sm text-gray-600">Test Sayısı</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-800">{totalQuestions}</h2>
              <p className="text-sm text-gray-600">Toplam Soru</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <ClockIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-800">{tests.length > 0 ? tests[0].timeLimit : 0}</h2>
              <p className="text-sm text-gray-600">Dakika (İlk Test)</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Son Eklenen Testler</h2>
          <Link 
            href="/dashboard/tests"
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            Tümünü Gör 
            <ArrowRightIcon className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="space-y-4">
          {tests.slice(0, 3).map(test => (
            <div key={test.id} className="border-b pb-4 last:border-b-0 last:pb-0">
              <h3 className="font-medium text-gray-800 mb-1">{test.title}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{test.description}</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-1" />
                    {test.questions.length} Soru
                  </span>
                  <span className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    {test.timeLimit} Dakika
                  </span>
                </div>
                <Link 
                  href={`/dashboard/tests/${test.slug}`}
                  className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors"
                >
                  Teste Git
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 