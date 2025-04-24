'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getIssuesForTeacher, Issue, DeviceType, DeviceLocation, IssueStatus } from '@/lib/supabase';
import AddIssueForm from './add-form';
import { EyeIcon, PlusIcon, ArrowRightOnRectangleIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { deleteCookie } from 'cookies-next';

interface IssueData extends Omit<Issue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null; 
}

interface TeacherUser {
  name: string;
  role: string;
  loginTime: string;
}

export default function TeacherIssuesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<IssueData | null>(null);
  const [isAddFormSubmitted, setIsAddFormSubmitted] = useState(false);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const router = useRouter();
  
  // Arızaları yükle
  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // API çağrısı
      const { data, error } = await getIssuesForTeacher(teacher?.name || '');
      
      if (error) {
        console.error('Arızalar yüklenirken hata oluştu:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        setIssues([]);
        setIsLoading(false);
        return;
      }
      
      // API'den gelen veriyi formata
      const formattedIssues = data.map(issue => ({
        id: issue.id,
        device_type: issue.device_type,
        device_name: issue.device_name,
        device_location: issue.device_location,
        room_number: issue.room_number,
        reported_by: issue.reported_by,
        assigned_to: issue.assigned_to,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        notes: issue.notes,
        created_at: new Date(issue.created_at).toLocaleString('tr-TR'),
        updated_at: issue.updated_at ? new Date(issue.updated_at).toLocaleString('tr-TR') : null,
        resolved_at: issue.resolved_at ? new Date(issue.resolved_at).toLocaleString('tr-TR') : null
      }));
      
      setIssues(formattedIssues);
    } catch (err) {
      console.error('Arızalar yüklenirken hata oluştu:', err);
      
      // Hata durumunda boş liste göster
      setIssues([]);
      alert('Arızalar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [teacher]);

  // Öğretmen giriş kontrolü
  useEffect(() => {
    const checkTeacherAuth = () => {
      if (typeof window !== 'undefined') {
        const teacherData = localStorage.getItem('teacherUser');
        if (!teacherData) {
          router.push('/teacher/login');
          return;
        }
        
        try {
          const parsedTeacher = JSON.parse(teacherData) as TeacherUser;
          setTeacher(parsedTeacher);
          
          // Giriş süresi kontrolü (örn: 8 saat sonra otomatik çıkış)
          const loginTime = new Date(parsedTeacher.loginTime).getTime();
          const currentTime = new Date().getTime();
          const hoursPassed = (currentTime - loginTime) / (1000 * 60 * 60);
          
          if (hoursPassed > 8) {
            // Oturum süresi dolmuş
            localStorage.removeItem('teacherUser');
            router.push('/teacher/login');
          } else {
            // Öğretmen bilgisi geçerliyse arızaları yükle
            loadIssues();
          }
        } catch (error) {
          console.error('Öğretmen verisi ayrıştırılamadı:', error);
          localStorage.removeItem('teacherUser');
          router.push('/teacher/login');
        }
      }
    };
    
    checkTeacherAuth();
  }, [router, loadIssues]);

  // Filtre işlemi
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = 
      (issue.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
      (issue.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (issue.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (issue.reported_by?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = selectedStatus === 'all' || issue.status === selectedStatus;
    const matchesType = selectedType === 'all' || issue.device_type === selectedType;
    const matchesLocation = selectedLocation === 'all' || issue.device_location === selectedLocation;
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  const viewIssueDetails = (issue: IssueData) => {
    setCurrentIssue(issue);
    setIsViewModalOpen(true);
  };
  
  const closeViewModal = () => {
    setIsViewModalOpen(false);
  };

  // Cihaz tipi çeviri fonksiyonu
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

  // Konum çeviri fonksiyonu
  const getLocationName = (location: DeviceLocation): string => {
    const locationNames: Record<DeviceLocation, string> = {
      'sinif': 'Sınıf',
      'laboratuvar': 'Laboratuvar',
      'idare': 'İdare',
      'ogretmenler_odasi': 'Öğretmenler Odası',
      'diger': 'Diğer'
    };
    return locationNames[location] || location;
  };

  // Durum çeviri fonksiyonu
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

  // Durum rengi belirleme fonksiyonu
  const getStatusColor = (status: IssueStatus): string => {
    const colors: Record<IssueStatus, string> = {
      'beklemede': 'status-badge status-badge-beklemede',
      'atandi': 'status-badge status-badge-atandi',
      'inceleniyor': 'status-badge status-badge-inceleniyor',
      'cozuldu': 'status-badge status-badge-cozuldu',
      'kapatildi': 'status-badge status-badge-kapatildi'
    };
    return colors[status] || 'status-badge';
  };

  // Arıza ekleme başarılı olduğunda çağrılacak fonksiyon
  const handleAddSuccess = () => {
    setIsAddFormSubmitted(true);
    setIsAddModalOpen(false);
    loadIssues();
  };

  // Modal kapatma fonksiyonu  
  const closeAddModal = (e?: React.MouseEvent) => {
    if (isAddFormSubmitted) {
      e?.stopPropagation();
      return;
    }
    
    if (window.confirm('Form kapatılacak. Devam etmek istiyor musunuz? Girdiğiniz bilgiler kaybolacak.')) {
      setIsAddModalOpen(false);
    }
  };

  // Öğretmen oturumunu kapatma
  const handleLogout = () => {
    if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      // Local Storage'dan sil
      localStorage.removeItem('teacherUser');
      
      // Cookie'den sil  
      deleteCookie('teacher-session', { path: '/' });
      
      // Login sayfasına yönlendir
      router.push('/teacher/login');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-3xl font-semibold text-blue-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen arıza verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null; // Yönlendirme beklenirken boş sayfa göster
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="teacher-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Öğretmen Arıza Bildirim Sistemi</h1>
              <p className="mt-1 text-gray-500">Merhaba, {teacher.name}! Arıza bildirimlerinizi yönetin</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtreler ve Arama */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4 md:mb-0">Arıza Bildirimlerim</h2>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Arıza Bildir
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="search"
                  id="search"
                  placeholder="Cihaz adı, arıza açıklaması veya oda numarası ile ara"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap md:flex-nowrap">
              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="beklemede">Beklemede</option>
                <option value="atandi">Atandı</option>
                <option value="inceleniyor">İnceleniyor</option>
                <option value="cozuldu">Çözüldü</option>
                <option value="kapatildi">Kapatıldı</option>
              </select>

              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Tüm Cihazlar</option>
                <option value="akilli_tahta">Akıllı Tahta</option>
                <option value="bilgisayar">Bilgisayar</option>
                <option value="yazici">Yazıcı</option>
                <option value="projektor">Projektör</option>
                <option value="diger">Diğer</option>
              </select>

              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="all">Tüm Konumlar</option>
                <option value="sinif">Sınıf</option>
                <option value="laboratuvar">Laboratuvar</option>
                <option value="idare">İdare</option>
                <option value="ogretmenler_odasi">Öğretmenler Odası</option>
                <option value="diger">Diğer</option>
              </select>
              
              <button 
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedType('all');
                  setSelectedLocation('all');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                Sıfırla
              </button>
            </div>
          </div>
        </div>
      
        {/* Arıza Tablosu */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {filteredIssues.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Arıza bildirimi bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedStatus !== 'all' || selectedType !== 'all' || selectedLocation !== 'all' 
                  ? 'Arama kriterlerinize uygun arıza kaydı bulunamadı' 
                  : 'Henüz arıza bildirimi yapmadınız'}
              </p>
              {!searchTerm && selectedStatus === 'all' && selectedType === 'all' && selectedLocation === 'all' && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    Yeni Arıza Bildir
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cihaz
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Konum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bildirim Tarihi
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-700 font-medium">{getDeviceTypeName(issue.device_type as DeviceType).charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{issue.device_name}</div>
                          <div className="text-sm text-gray-500">{getDeviceTypeName(issue.device_type as DeviceType)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getLocationName(issue.device_location as DeviceLocation)}</div>
                      <div className="text-sm text-gray-500">{issue.room_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusColor(issue.status as IssueStatus)}>
                        {getStatusName(issue.status as IssueStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issue.created_at}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition-colors"
                        onClick={() => viewIssueDetails(issue)}
                        title="Detay Görüntüle"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* View Modal */}
      {isViewModalOpen && currentIssue && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="modal-content max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Arıza Detayları</h2>
                <button
                  onClick={closeViewModal}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <dl className="divide-y divide-gray-200">
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Cihaz Türü</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{getDeviceTypeName(currentIssue.device_type as DeviceType)}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Cihaz Adı</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{currentIssue.device_name}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Konum</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{getLocationName(currentIssue.device_location as DeviceLocation)} - {currentIssue.room_number}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Bildiren</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{currentIssue.reported_by}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Durum</dt>
                  <dd className="text-sm text-gray-900 col-span-2">
                    <span className={getStatusColor(currentIssue.status as IssueStatus)}>
                      {getStatusName(currentIssue.status as IssueStatus)}
                    </span>
                  </dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Bildirim Tarihi</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{currentIssue.created_at}</dd>
                </div>
                <div className="py-3 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Açıklama</dt>
                  <dd className="text-sm text-gray-900 col-span-2 whitespace-pre-wrap">{currentIssue.description}</dd>
                </div>
                {currentIssue.notes && (
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">Teknik Notlar</dt>
                    <dd className="text-sm text-gray-900 col-span-2 whitespace-pre-wrap">{currentIssue.notes}</dd>
                  </div>
                )}
                {currentIssue.assigned_to && (
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">Atanan Kişi</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{currentIssue.assigned_to}</dd>
                  </div>
                )}
                {currentIssue.resolved_at && (
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500">Çözüldüğü Tarih</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{currentIssue.resolved_at}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={closeViewModal}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div
            className="modal-content max-w-2xl bg-white rounded-lg shadow-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Yeni Arıza Bildir</h2>
                <button
                  onClick={closeAddModal}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <AddIssueForm
                onSuccess={handleAddSuccess}
                onCancel={closeAddModal}
                teacherName={teacher.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 