'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PresentationChartLineIcon, ExclamationCircleIcon, CheckCircleIcon, BellAlertIcon, UsersIcon, DocumentTextIcon, AdjustmentsHorizontalIcon, ComputerDesktopIcon, PrinterIcon, FilmIcon, DeviceTabletIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/solid';
// Temporary fix for missing getCounts - this will be implemented in supabase.ts
// import { getCounts } from '@/lib/supabase';
// Sidebar artık layout'tan geldiği için import etmeye gerek yok
// import Sidebar from '@/components/Sidebar';

// Demo modu sabit değişkeni
const DEMO_MODE = false;

interface DashboardCounts {
  openIssuesCount: number;
  resolvedIssuesCount: number;
  usersCount: number;
  totalIssuesCount: number;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState<DashboardCounts>({
    openIssuesCount: 0,
    resolvedIssuesCount: 0,
    usersCount: 0,
    totalIssuesCount: 0
  });
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<{id: string; message: string; isRead: boolean}[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const supabaseSubscription = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Supabase'den gerçek verileri çek
        const { getIssues, getUsers } = await import('@/lib/supabase');
        
        // Arızaları çek
        const issuesResult = await getIssues();
        if (issuesResult.error) {
          console.error('Arızalar yüklenirken hata:', issuesResult.error);
          alert('Arıza verileri yüklenirken hata oluştu. Lütfen Supabase ayarlarınızı kontrol edin.');
          throw issuesResult.error;
        }
        
        // Kullanıcıları çek
        const usersResult = await getUsers();
        if (usersResult.error) {
          console.error('Kullanıcılar yüklenirken hata:', usersResult.error);
          alert('Kullanıcı verileri yüklenirken hata oluştu. Lütfen Supabase ayarlarınızı kontrol edin.');
          throw usersResult.error;
        }
        
        // İstatistikleri hesapla
        const issues = issuesResult.data || [];
        const users = usersResult.data || [];
        
        const openIssues = issues.filter(issue => 
          issue.status !== 'cozuldu' && issue.status !== 'kapatildi'
        );
        
        const resolvedIssues = issues.filter(issue => 
          issue.status === 'cozuldu' || issue.status === 'kapatildi'
        );
        
        setCounts({
          openIssuesCount: openIssues.length,
          resolvedIssuesCount: resolvedIssues.length,
          usersCount: users.length,
          totalIssuesCount: issues.length
        });

        // Son eklenen 5 arızayı al - yeni arızalar en üstte
        const sortedIssues = [...issues]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(issue => ({
            id: issue.id,
            device_type: issue.device_type,
            device_name: issue.device_name,
            description: issue.description,
            status: issue.status,
            reported_by: issue.reported_by,
            room_number: issue.room_number || 'Belirtilmedi',
            created_at: issue.created_at
          }));

        setRecentIssues(sortedIssues);
      } catch (err) {
        console.error('Dashboard verileri yüklenemedi:', err);
        
        // Hata durumunda sıfır değerler göster
        setCounts({
          openIssuesCount: 0,
          resolvedIssuesCount: 0,
          usersCount: 0,
          totalIssuesCount: 0
        });
        setRecentIssues([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Check authentication first
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const adminSession = localStorage.getItem('adminUser');
        
        if (!adminSession) {
          router.push('/login');
          return false;
        }
        
        try {
          const parsedSession = JSON.parse(adminSession || '{}');
          const isValid = parsedSession && parsedSession.role === 'admin';
          
          if (!isValid) {
            router.push('/login');
            return false;
          }
          
          return true;
        } catch (error) {
          console.error('Admin verisi ayrıştırılamadı:', error);
          router.push('/login');
          return false;
        }
      }
      return false;
    };
    
    const isAuthenticated = checkAuth();
    
    if (isAuthenticated) {
      loadDashboardData();
      setupRealtimeSubscription();
    }

    return () => {
      // Aboneliği temizle
      if (supabaseSubscription.current) {
        supabaseSubscription.current.unsubscribe();
      }
    };
  }, [router]);

  // Gerçek zamanlı abonelik kurulumu
  const setupRealtimeSubscription = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      console.log('Realtime subscription kurulumu başlatılıyor...');
      
      // issues tablosundaki yeni kayıtları dinle
      supabaseSubscription.current = supabase
        .channel('issues-channel')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'issues' 
        }, (payload) => {
          console.log('Yeni arıza bildirimi alındı:', payload);
          
          // Yeni bir arıza oluşturulduğunda
          const newIssue = payload.new;
          
          // Bildirim oluştur
          const notification = {
            id: newIssue.id,
            message: `Yeni arıza bildirimi: ${newIssue.device_name} (${getDeviceTypeName(newIssue.device_type)}) - ${newIssue.reported_by} tarafından`,
            isRead: false
          };
          
          // Bildirimleri güncelle
          setNotifications(prev => [notification, ...prev]);
          
          // Bildirim göster
          setShowNotification(true);
          
          // Sayıları güncelle
          setCounts(prev => ({
            ...prev,
            openIssuesCount: prev.openIssuesCount + 1,
            totalIssuesCount: prev.totalIssuesCount + 1
          }));
          
          // Son arızaları güncelle
          const formattedIssue = {
            id: newIssue.id,
            device_type: newIssue.device_type,
            device_name: newIssue.device_name,
            description: newIssue.description,
            status: newIssue.status,
            reported_by: newIssue.reported_by,
            room_number: newIssue.room_number || 'Belirtilmedi',
            created_at: newIssue.created_at
          };
          
          setRecentIssues(prev => [formattedIssue, ...prev.slice(0, 4)]);
          
          // Sesli bildirim
          playNotificationSound();
        })
        .subscribe((status) => {
          console.log('Realtime subscription durumu:', status);
        });
      
    } catch (error) {
      console.error('Gerçek zamanlı abonelik kurulurken hata:', error);
    }
  };

  // Bildirim sesi çal
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Ses çalma hatası:', e));
    } catch (error) {
      console.error('Bildirim sesi çalınamadı:', error);
    }
  };

  // Bildirimi kapat
  const closeNotification = () => {
    setShowNotification(false);
  };

  // Bildirime tıklama
  const handleNotificationClick = (id: string) => {
    // Bildirimi okundu olarak işaretle
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
    
    // İlgili arıza detayına yönlendir
    router.push(`/dashboard/issues?id=${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-3xl font-semibold text-blue-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen panel verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  // Helper functions for display
  const getDeviceTypeName = (type: string) => {
    switch (type) {
      case 'akilli_tahta': return 'Akıllı Tahta';
      case 'bilgisayar': return 'Bilgisayar';
      case 'yazici': return 'Yazıcı';
      case 'projektor': return 'Projektör';
      case 'diger': return 'Diğer';
      default: return type;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'beklemede': return 'Beklemede';
      case 'atandi': return 'Atandı';
      case 'inceleniyor': return 'İnceleniyor';
      case 'cozuldu': return 'Çözüldü';
      case 'kapatildi': return 'Kapatıldı';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'beklemede': return 'bg-yellow-100 text-yellow-800';
      case 'atandi': return 'bg-blue-100 text-blue-800';
      case 'inceleniyor': return 'bg-purple-100 text-purple-800';
      case 'cozuldu': return 'bg-green-100 text-green-800';
      case 'kapatildi': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="admin-content">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bildirim alanı */}
        {showNotification && notifications.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <BellIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">Yeni arıza bildirimi</p>
                  <p className="mt-1 text-sm text-gray-500">{notifications[0].message}</p>
                  <div className="mt-3 flex space-x-3">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => handleNotificationClick(notifications[0].id)}
                    >
                      Görüntüle
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={closeNotification}
                    >
                      Kapat
                    </button>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={closeNotification}
                  >
                    <span className="sr-only">Kapat</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">Yönetim Paneli</h1>
          <p className="mt-1 text-gray-500">
            Teknik servis yazılımı istatistikleri ve durumu
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Açık Arıza Sayısı */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                  <ExclamationCircleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Bekleyen Arıza</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{counts.openIssuesCount}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/issues" className="font-medium text-blue-600 hover:text-blue-500">
                  Tüm arızaları görüntüle
                </Link>
              </div>
            </div>
          </div>

          {/* Çözülen Arıza Sayısı */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Çözülen Arıza</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{counts.resolvedIssuesCount}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/reports" className="font-medium text-blue-600 hover:text-blue-500">
                  Raporları görüntüle
                </Link>
              </div>
            </div>
          </div>

          {/* Toplam Kullanıcı Sayısı */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <UsersIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Kullanıcılar</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{counts.usersCount}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/users" className="font-medium text-blue-600 hover:text-blue-500">
                  Kullanıcıları yönet
                </Link>
              </div>
            </div>
          </div>

          {/* Toplam Arıza Sayısı */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <DocumentTextIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Toplam Arıza</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{counts.totalIssuesCount}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/settings" className="font-medium text-blue-600 hover:text-blue-500">
                  Sistem ayarları
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Son Eklenen Arızalar */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Son Eklenen Arızalar</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentIssues.length === 0 ? (
                <div className="text-center py-10">
                  <BellAlertIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Arıza Bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Henüz herhangi bir arıza kaydı bulunmamaktadır.
                  </p>
                  <div className="mt-6">
                    <Link 
                      href="/dashboard/issues?open=add"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                      Arıza Ekle
                    </Link>
                  </div>
                </div>
              ) : (
                recentIssues.map((issue) => (
                  <div key={issue.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {issue.device_type === 'bilgisayar' ? (
                            <ComputerDesktopIcon className="h-8 w-8 text-blue-500" />
                          ) : issue.device_type === 'yazici' ? (
                            <PrinterIcon className="h-8 w-8 text-green-500" />
                          ) : issue.device_type === 'projektor' ? (
                            <FilmIcon className="h-8 w-8 text-purple-500" />
                          ) : issue.device_type === 'akilli_tahta' ? (
                            <DeviceTabletIcon className="h-8 w-8 text-indigo-500" />
                          ) : (
                            <DevicePhoneMobileIcon className="h-8 w-8 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900">{issue.device_name}</h4>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span>{getDeviceTypeName(issue.device_type)}</span>
                            <span className="mx-1">•</span>
                            <span>Oda: {issue.room_number}</span>
                            <span className="mx-1">•</span>
                            <span>Bildirim: {issue.reported_by}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-1">{issue.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                          {getStatusName(issue.status)}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(issue.created_at)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={`/dashboard/issues?id=${issue.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Detayları Görüntüle →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 sm:px-6 text-center">
              <Link 
                href="/dashboard/issues"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Tüm Arızaları Görüntüle
              </Link>
            </div>
          </div>
        </div>
        
        {/* Grafikler / İstatistikler */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Arıza İstatistikleri</h3>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:p-6">
              {/* Basit istatistik kartları */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Cihaz Tiplerine Göre Arızalar
                      </dt>
                      <dd className="mt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-blue-500 mr-2"></span>
                            <span className="text-sm text-gray-500">Bilgisayar</span>
                          </div>
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                            <span className="text-sm text-gray-500">Yazıcı</span>
                          </div>
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-purple-500 mr-2"></span>
                            <span className="text-sm text-gray-500">Projektör</span>
                          </div>
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-indigo-500 mr-2"></span>
                            <span className="text-sm text-gray-500">Akıllı Tahta</span>
                          </div>
                        </div>
                        {/* Basit çubuk grafik simülasyonu */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-blue-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.device_type === 'bilgisayar').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-green-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.device_type === 'yazici').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-purple-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.device_type === 'projektor').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-indigo-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.device_type === 'akilli_tahta').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Durumlara Göre Arızalar
                      </dt>
                      <dd className="mt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></span>
                            <span className="text-sm text-gray-500">Beklemede</span>
                          </div>
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-blue-500 mr-2"></span>
                            <span className="text-sm text-gray-500">Atandı</span>
                          </div>
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-purple-500 mr-2"></span>
                            <span className="text-sm text-gray-500">İnceleniyor</span>
                          </div>
                          <div className="flex items-center">
                            <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                            <span className="text-sm text-gray-500">Çözüldü</span>
                          </div>
                        </div>
                        {/* Basit çubuk grafik simülasyonu */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-yellow-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.status === 'beklemede').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-blue-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.status === 'atandi').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-purple-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.status === 'inceleniyor').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-green-500 h-2.5 rounded-full" style={{ 
                                width: `${Math.min(100, Math.max(0, (recentIssues.filter(i => i.status === 'cozuldu').length / Math.max(1, recentIssues.length)) * 100))}%` 
                              }}></div>
                            </div>
                          </div>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Aylık Arıza Trendi
                      </dt>
                      <dd className="mt-4">
                        <div className="flex h-16 items-end space-x-1">
                          {[...Array(10)].map((_, index) => {
                            // Rastgele yükseklik (gerçek uygulamada gerçek verilerle değiştirilmeli)
                            const height = 30 + Math.floor(Math.random() * 70);
                            return (
                              <div 
                                key={index}
                                className="w-full bg-blue-500 rounded-t"
                                style={{ height: `${height}%` }}
                              ></div>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          Son 10 gündeki arıza bildirimleri
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        En Sık Arızalanan Cihazlar
                      </dt>
                      <dd className="mt-4">
                        <ul className="space-y-2">
                          {recentIssues
                            .reduce((acc: { device_name: string; device_type: string; count: number }[], issue) => {
                              const existingDevice = acc.find((i: { device_name: string }) => i.device_name === issue.device_name);
                              if (existingDevice) {
                                existingDevice.count += 1;
                              } else {
                                acc.push({ device_name: issue.device_name, device_type: issue.device_type, count: 1 });
                              }
                              return acc;
                            }, [] as { device_name: string; device_type: string; count: number }[])
                            .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
                            .slice(0, 5)
                            .map((device: { device_name: string; device_type: string; count: number }, index: number) => (
                              <li key={index} className="flex justify-between items-center">
                                <span className="text-sm">{device.device_name}</span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  {device.count} arıza
                                </span>
                              </li>
                            ))}
                        </ul>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 sm:px-6 text-center">
              <Link 
                href="/dashboard/reports"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Detaylı Raporlara Git
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 