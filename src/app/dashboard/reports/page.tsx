'use client';

import { useState } from 'react';

interface ReportInfo {
  id: string;
  name: string;
  description: string;
  lastGenerated: string;
  format: 'CSV' | 'PDF' | 'Excel';
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const reports: ReportInfo[] = [
    {
      id: 'issues',
      name: 'Arıza Bildirimleri Raporu',
      description: 'Belirli dönemdeki arıza bildirimlerinin özeti ve durumları',
      lastGenerated: '2023-12-10',
      format: 'PDF'
    },
    {
      id: 'devices',
      name: 'Cihaz Envanteri Raporu',
      description: 'Okuldaki tüm cihazların türü, konumu ve durumu hakkında detaylı bilgiler',
      lastGenerated: '2023-12-08',
      format: 'Excel'
    },
    {
      id: 'technicians',
      name: 'Teknisyen Performans Raporu',
      description: 'Teknisyenlerin çözdüğü arıza sayısı ve ortalama çözüm süreleri',
      lastGenerated: '2023-12-05',
      format: 'CSV'
    },
    {
      id: 'departments',
      name: 'Departman Bazlı Arıza Raporu',
      description: 'Okul bölümlerine göre arıza yoğunluğu analizi',
      lastGenerated: '2023-12-01',
      format: 'PDF'
    },
    {
      id: 'monthly',
      name: 'Aylık Arıza Özeti',
      description: 'Ay içinde bildirilen ve çözülen arızaların özet raporu',
      lastGenerated: '2023-11-30',
      format: 'Excel'
    }
  ];

  const handleGenerateReport = async (reportId: string) => {
    setIsGenerating(true);
    
    // Rapor oluşturma simülasyonu
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    alert(`${reportId} raporu başarıyla oluşturuldu. Şimdi indirebilirsiniz.`);
    setIsGenerating(false);
  };

  // Rapor formatına göre arkaplan rengi belirleme
  const getFormatBadgeClasses = (format: ReportInfo['format']) => {
    switch (format) {
      case 'CSV':
        return 'bg-green-100 text-green-800';
      case 'PDF':
        return 'bg-red-100 text-red-800';
      case 'Excel':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Raporlar</h1>
        <p className="mt-1 text-gray-500">Okul arıza yönetim sistemi raporlarını oluşturun ve indirin</p>
      </div>
      
      {/* Zaman aralığı seçici */}
      <div className="bg-white p-4 shadow rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Zaman Aralığı:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                selectedPeriod === 'week' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSelectedPeriod('week')}
            >
              Haftalık
            </button>
            <button
              type="button"
              className={`relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 text-sm font-medium ${
                selectedPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSelectedPeriod('month')}
            >
              Aylık
            </button>
            <button
              type="button"
              className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                selectedPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSelectedPeriod('year')}
            >
              Yıllık
            </button>
          </div>
          
          <div className="flex-1"></div>
          
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Özel Rapor Oluştur
          </button>
        </div>
      </div>
      
      {/* Raporlar listesi */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {reports.map((report) => (
            <li key={report.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600 truncate">{report.name}</p>
                    <div className="flex mt-1">
                      <p className="text-sm text-gray-500">{report.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getFormatBadgeClasses(
                        report.format
                      )}`}
                    >
                      {report.format}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={() => handleGenerateReport(report.name)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? 'Oluşturuluyor...' : 'Oluştur'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        İndir
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Son oluşturulma: <time>{report.lastGenerated}</time>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Analiz Özeti */}
      <div className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analiz Özeti</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Toplam Arıza</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">153</p>
            <p className="mt-1 text-sm text-green-600">↑ 8% geçen aya göre</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Çözülen Arıza</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">142</p>
            <p className="mt-1 text-sm text-green-600">↑ 12% geçen aya göre</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Ortalama Çözüm Süresi</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">2.3 gün</p>
            <p className="mt-1 text-sm text-green-600">↓ 0.5 gün geçen aya göre</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Aktif Arızalar</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">11</p>
            <p className="mt-1 text-sm text-red-600">↑ 3 geçen haftaya göre</p>
          </div>
        </div>
      </div>
    </div>
  );
} 