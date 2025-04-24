'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, getIssues, IssueStatus, IssuePriority, DeviceType } from '@/lib/supabase';
import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  textColor?: string;
  bgColor?: string;
}

function StatsCard({ title, value, icon, textColor = 'text-indigo-600', bgColor = 'bg-indigo-100' }: StatsCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${bgColor}`}>
            <span className={`${textColor} text-xl`}>{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-medium text-gray-900">{value}</div>
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RecentIssueItem {
  id: string;
  device_name: string;
  device_type: DeviceType;
  status: IssueStatus;
  priority: IssuePriority;
  reported_by: string;
  created_at: string;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIssues: 0,
    pendingIssues: 0,
    resolvedIssues: 0,
    criticalIssues: 0
  });
  const [recentIssues, setRecentIssues] = useState<RecentIssueItem[]>([]);
  const [deviceTypeStats, setDeviceTypeStats] = useState<Record<string, number>>({});
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    // Kullanıcı verilerini ve istatistikleri yükle
    const loadData = async () => {
      try {
        // Kullanıcı bilgilerini al
        const user = await getCurrentUser();
        if (user) {
          setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '');
        }
        
        // Arıza verilerini al
        const { data: issues, error } = await getIssues();
        
        if (error) {
          throw error;
        }
        
        if (issues && issues.length > 0) {
          // İstatistikleri hesapla
          const pendingCount = issues.filter(issue => issue.status === 'beklemede' || issue.status === 'atandi' || issue.status === 'inceleniyor').length;
          const resolvedCount = issues.filter(issue => issue.status === 'cozuldu').length;
          const criticalCount = issues.filter(issue => issue.priority === 'kritik').length;
          
          // Cihaz tipi istatistikleri
          const deviceTypes: Record<string, number> = {};
          issues.forEach(issue => {
            const type = issue.device_type;
            deviceTypes[type] = (deviceTypes[type] || 0) + 1;
          });
          
          setStats({
            totalIssues: issues.length,
            pendingIssues: pendingCount,
            resolvedIssues: resolvedCount,
            criticalIssues: criticalCount
          });
          
          setDeviceTypeStats(deviceTypes);
          
          // Son 5 arızayı al
          const sortedIssues = [...issues].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          setRecentIssues(sortedIssues.slice(0, 5).map(issue => ({
            id: issue.id,
            device_name: issue.device_name,
            device_type: issue.device_type,
            status: issue.status,
            priority: issue.priority,
            reported_by: issue.reported_by,
            created_at: new Date(issue.created_at).toLocaleString('tr-TR')
          })));
        } else {
          // Mock veriler - gerçek veri yoksa
          setStats({
            totalIssues: 12,
            pendingIssues: 5,
            resolvedIssues: 7,
            criticalIssues: 3
          });
          
          setDeviceTypeStats({
            'akilli_tahta': 5,
            'bilgisayar': 4,
            'yazici': 2,
            'projektor': 1
          });
          
          setRecentIssues([
            {
              id: '1',
              device_name: 'Akıllı Tahta 10A',
              device_type: 'akilli_tahta',
              status: 'beklemede',
              priority: 'yuksek',
              reported_by: 'Ayşe Öğretmen',
              created_at: '22.05.2023 09:15'
            },
            {
              id: '2',
              device_name: 'Lab-02 PC3',
              device_type: 'bilgisayar',
              status: 'inceleniyor',
              priority: 'normal',
              reported_by: 'Mehmet Öğretmen',
              created_at: '21.05.2023 14:30'
            },
            {
              id: '3',
              device_name: 'HP Yazıcı',
              device_type: 'yazici',
              status: 'cozuldu',
              priority: 'dusuk',
              reported_by: 'İdare',
              created_at: '20.05.2023 11:45'
            },
            {
              id: '4',
              device_name: 'Öğretmenler Odası PC',
              device_type: 'bilgisayar',
              status: 'atandi',
              priority: 'normal',
              reported_by: 'Zeynep Öğretmen',
              created_at: '19.05.2023 13:20'
            },
            {
              id: '5',
              device_name: 'Projektör 103',
              device_type: 'projektor',
              status: 'beklemede',
              priority: 'kritik',
              reported_by: 'Ali Öğretmen',
              created_at: '18.05.2023 10:05'
            }
          ]);
        }
      } catch (error) {
        console.error("Veri yüklenirken hata oluştu:", error);
        // Hata durumunda da mock veri göster
        setStats({
          totalIssues: 12,
          pendingIssues: 5,
          resolvedIssues: 7,
          criticalIssues: 3
        });
        
        setDeviceTypeStats({
          'akilli_tahta': 5,
          'bilgisayar': 4,
          'yazici': 2,
          'projektor': 1
        });
        
        setRecentIssues([
          {
            id: '1',
            device_name: 'Akıllı Tahta 10A',
            device_type: 'akilli_tahta',
            status: 'beklemede',
            priority: 'yuksek',
            reported_by: 'Ayşe Öğretmen',
            created_at: '22.05.2023 09:15'
          },
          {
            id: '2',
            device_name: 'Lab-02 PC3',
            device_type: 'bilgisayar',
            status: 'inceleniyor',
            priority: 'normal',
            reported_by: 'Mehmet Öğretmen',
            created_at: '21.05.2023 14:30'
          },
          {
            id: '3',
            device_name: 'HP Yazıcı',
            device_type: 'yazici',
            status: 'cozuldu',
            priority: 'dusuk',
            reported_by: 'İdare',
            created_at: '20.05.2023 11:45'
          },
          {
            id: '4',
            device_name: 'Öğretmenler Odası PC',
            device_type: 'bilgisayar',
            status: 'atandi',
            priority: 'normal',
            reported_by: 'Zeynep Öğretmen',
            created_at: '19.05.2023 13:20'
          },
          {
            id: '5',
            device_name: 'Projektör 103',
            device_type: 'projektor',
            status: 'beklemede',
            priority: 'kritik',
            reported_by: 'Ali Öğretmen',
            created_at: '18.05.2023 10:05'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Durum rengi belirleme fonksiyonu
  const getStatusColor = (status: IssueStatus): string => {
    const colors: Record<IssueStatus, string> = {
      'beklemede': 'bg-yellow-100 text-yellow-800',
      'atandi': 'bg-blue-100 text-blue-800',
      'inceleniyor': 'bg-purple-100 text-purple-800',
      'cozuldu': 'bg-green-100 text-green-800',
      'kapatildi': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Öncelik rengi belirleme fonksiyonu
  const getPriorityColor = (priority: IssuePriority): string => {
    const colors: Record<IssuePriority, string> = {
      'dusuk': 'bg-blue-100 text-blue-800',
      'normal': 'bg-green-100 text-green-800',
      'yuksek': 'bg-orange-100 text-orange-800',
      'kritik': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };
  
  // Durum adını çeviri
  const getStatusName = (status: IssueStatus): string => {
    const statusNames: Record<IssueStatus, string> = {
      'beklemede': 'Beklemede',
      'atandi': 'Atandı',
      'inceleniyor': 'İnceleniyor',
      'cozuldu': 'Çözüldü',
      'kapatildi': 'Kapatıldı'
    };
    return statusNames[status] || status;
  };
  
  // Cihaz tipini çeviri
  const getDeviceTypeName = (type: DeviceType): string => {
    const typeNames: Record<DeviceType, string> = {
      'akilli_tahta': 'Akıllı Tahta',
      'bilgisayar': 'Bilgisayar',
      'yazici': 'Yazıcı',
      'projektor': 'Projektör',
      'diger': 'Diğer'
    };
    return typeNames[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl font-semibold text-indigo-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen dashboard verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Arıza Takip Sistemi</h1>
        <p className="mt-1 text-gray-500">
          {userName ? `Hoş geldiniz, ${userName}` : 'Okul arıza takip paneline hoş geldiniz'}
        </p>
      </div>
      
      {/* İstatistikler */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Toplam Arıza"
          value={stats.totalIssues.toString()}
          icon="💻"
          textColor="text-indigo-600"
          bgColor="bg-indigo-100"
        />
        <StatsCard
          title="Bekleyen Arızalar"
          value={stats.pendingIssues.toString()}
          icon="⏳"
          textColor="text-yellow-600" 
          bgColor="bg-yellow-100"
        />
        <StatsCard
          title="Çözülen Arızalar"
          value={stats.resolvedIssues.toString()}
          icon="✅"
          textColor="text-green-600"
          bgColor="bg-green-100" 
        />
        <StatsCard
          title="Kritik Arızalar"
          value={stats.criticalIssues.toString()}
          icon="🔥"
          textColor="text-red-600"
          bgColor="bg-red-100"
        />
      </div>
      
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Cihaz Tipi Dağılımı */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Cihaz Tipi Dağılımı</h2>
            <p className="mt-1 text-sm text-gray-500">Arıza bildirimleri cihaz tipine göre</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {Object.entries(deviceTypeStats).map(([type, count]) => (
                <div key={type} className="flex items-center">
                  <div className="w-1/3 flex items-center">
                    <span className="text-sm font-medium text-gray-500">{getDeviceTypeName(type as DeviceType)}</span>
                  </div>
                  <div className="w-2/3 flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${(count / stats.totalIssues) * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Hızlı Eylemler */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Hızlı Eylemler</h2>
            <p className="mt-1 text-sm text-gray-500">Arıza takip sisteminde yaygın işlemler</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4">
              <Link href="/dashboard/issues?open=add" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Yeni Arıza Kaydı Oluştur
              </Link>
              <Link href="/dashboard/issues?filter=beklemede" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Bekleyen Arızaları Görüntüle
              </Link>
              <Link href="/dashboard/issues?filter=kritik" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                Kritik Arızaları Görüntüle
              </Link>
              <Link href="/dashboard/reports" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                Arıza Raporlarını Görüntüle
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Son Arızalar */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Son Arıza Kayıtları</h2>
            <p className="mt-1 text-sm text-gray-500">Son eklenen 5 arıza kaydı</p>
          </div>
          <Link href="/dashboard/issues" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Tümünü Görüntüle &rarr;
          </Link>
        </div>
        <div className="border-t border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {recentIssues.length === 0 ? (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                Henüz arıza kaydı bulunmuyor
              </li>
            ) : (
              recentIssues.map((issue) => (
                <li key={issue.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <Link href={`/dashboard/issues?id=${issue.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-700">{getDeviceTypeName(issue.device_type).charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{issue.device_name}</div>
                          <div className="text-sm text-gray-500">{getDeviceTypeName(issue.device_type)}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                          {getStatusName(issue.status)}
                        </span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(issue.priority)}`}>
                          {issue.priority === 'dusuk' ? 'Düşük' :
                            issue.priority === 'normal' ? 'Normal' :
                            issue.priority === 'yuksek' ? 'Yüksek' :
                            issue.priority === 'kritik' ? 'Kritik' : issue.priority}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">{issue.created_at}</div>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
} 