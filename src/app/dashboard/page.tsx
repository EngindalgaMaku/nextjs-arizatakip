'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PresentationChartLineIcon, ExclamationCircleIcon, CheckCircleIcon, BellAlertIcon, UsersIcon, DocumentTextIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
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
      } catch (err) {
        console.error('Dashboard verileri yüklenemedi:', err);
        
        // Hata durumunda sıfır değerler göster
        setCounts({
          openIssuesCount: 0,
          resolvedIssuesCount: 0,
          usersCount: 0,
          totalIssuesCount: 0
        });
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
    }
  }, [router]);

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

  return (
    <div className="admin-content">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <div className="bg-gray-50 px-4 py-5 sm:p-6">
              <div className="text-center py-10">
                <BellAlertIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Yakında Eklenecek</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Bu özellik yakında aktif olacaktır.
                </p>
                <div className="mt-6">
                  <Link 
                    href="/dashboard/issues"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Arızaları Görüntüle
                  </Link>
                </div>
              </div>
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
              <div className="text-center py-10">
                <PresentationChartLineIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Yakında Eklenecek</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Grafikler ve detaylı istatistikler yakında eklenecektir.
                </p>
                <div className="mt-6">
                  <Link 
                    href="/dashboard/reports"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Rapor Sayfasına Git
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 