'use client';

import { useState, useEffect, useCallback } from 'react';
import { getIssues, deleteIssue, Issue, DeviceType, DeviceLocation, IssueStatus, IssuePriority, getIssue } from '@/lib/supabase';
import AddIssueForm from './add-form';
import EditIssueForm from './edit-form';
import ViewIssueForm from './view-issue-form';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';

interface IssueData extends Omit<Issue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null; 
}

export default function IssuesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<IssueData | null>(null);
  const [isAddFormSubmitted, setIsAddFormSubmitted] = useState(false);

  // Arızaları yükle
  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Mock veriyi her zaman hazır tut (geliştirme veya hata durumları için)
      const mockIssues: IssueData[] = [
        {
          id: '1',
          device_type: 'akilli_tahta' as DeviceType,
          device_name: 'Smart Board X1',
          device_location: 'sinif' as DeviceLocation,
          room_number: '101',
          reported_by: 'Murat Öğretmen',
          assigned_to: null,
          description: 'Akıllı tahta açılmıyor, güç düğmesine basınca sadece kırmızı ışık yanıp sönüyor.',
          status: 'beklemede' as IssueStatus,
          priority: 'yuksek' as IssuePriority,
          notes: null,
          created_at: '22.05.2023 09:15',
          updated_at: null,
          resolved_at: null
        },
        {
          id: '2',
          device_type: 'bilgisayar' as DeviceType,
          device_name: 'Bilgisayar Lab-01-PC12',
          device_location: 'laboratuvar' as DeviceLocation,
          room_number: 'Lab-01',
          reported_by: 'Ayşe Öğretmen',
          assigned_to: 'Ahmet Teknisyen',
          description: 'Bilgisayar çok yavaş açılıyor ve arada donuyor.',
          status: 'inceleniyor' as IssueStatus,
          priority: 'normal' as IssuePriority,
          notes: 'Disk temizliği ve virüs taraması yapıldı, RAM kontrol edilecek.',
          created_at: '20.05.2023 14:30',
          updated_at: '21.05.2023 10:45',
          resolved_at: null
        },
        {
          id: '3',
          device_type: 'yazici' as DeviceType,
          device_name: 'HP LaserJet 107w',
          device_location: 'idare' as DeviceLocation,
          room_number: 'Müdür Yrd. Odası',
          reported_by: 'Zeynep Müdür Yrd.',
          assigned_to: 'Ahmet Teknisyen',
          description: 'Yazıcı kağıdı sıkıştırıyor ve yazdırmıyor.',
          status: 'cozuldu' as IssueStatus,
          priority: 'yuksek' as IssuePriority,
          notes: 'Yazıcı içindeki sıkışmış kağıtlar temizlendi, test baskısı alındı.',
          created_at: '18.05.2023 11:20',
          updated_at: '18.05.2023 13:45',
          resolved_at: '18.05.2023 13:45'
        },
      ];
      
      let useRealData = true;
      
      try {
        // Gerçek API çağrısı yap (production'da)
        const { data, error } = await getIssues();
        
        if (error) {
          console.warn('Supabase veri çekme hatası:', error);
          useRealData = false;
        } else if (!data || data.length === 0) {
          console.log('Supabase\'den veri alındı fakat hiç kayıt yok, mock veri kullanılacak');
          useRealData = false;
        } else {
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
        }
      } catch (err) {
        console.error('API çağrısı hatası:', err);
        useRealData = false;
      }
      
      // Eğer gerçek veri alınamadıysa veya sorun oluştuysa mock veri kullan
      if (!useRealData) {
        console.log('Mock veri kullanılıyor');
        setIssues(mockIssues);
      }
    } catch (err) {
      console.error('Arızalar yüklenirken hata oluştu:', err);
      alert('Arızalar yüklenirken bir hata oluştu. Mock veriler gösterilecek.');
      // Yine de kullanıcıya bir şeyler gösterelim
      setIssues([
        {
          id: '1',
          device_type: 'akilli_tahta' as DeviceType,
          device_name: 'DEMO - Akıllı Tahta',
          device_location: 'sinif' as DeviceLocation,
          room_number: 'Demo-101',
          reported_by: 'Demo Kullanıcı',
          assigned_to: null,
          description: 'Demo arıza kaydı - Veritabanı bağlantısı kurulamadı',
          status: 'beklemede' as IssueStatus,
          priority: 'normal' as IssuePriority,
          notes: null,
          created_at: new Date().toLocaleString('tr-TR'),
          updated_at: null,
          resolved_at: null
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);
  
  // URL'den parametreleri kontrol et
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const issueId = params.get('id');
      const openAddForm = params.get('open') === 'add';
      const filterStatus = params.get('filter');
      
      // URL'de ID varsa o arıza detayını göster
      if (issueId) {
        const loadIssueDetails = async () => {
          try {
            // Doğrudan belirli ID'li arızayı çek
            const { data, error } = await getIssue(issueId);
            
            if (error || !data) {
              console.error('Arıza detayları yüklenirken hata oluştu:', error);
              alert('Arıza detayları yüklenirken bir hata oluştu.');
              return;
            }
            
            // Veriyi IssueData formatına çevir
            const formattedIssue: IssueData = {
              ...data,
              created_at: new Date(data.created_at).toLocaleString('tr-TR'),
              updated_at: data.updated_at ? new Date(data.updated_at).toLocaleString('tr-TR') : null,
              resolved_at: data.resolved_at ? new Date(data.resolved_at).toLocaleString('tr-TR') : null
            };
            
            setCurrentIssue(formattedIssue);
            setIsViewModalOpen(true);
          } catch (err) {
            console.error('Arıza detayları yüklenirken hata oluştu:', err);
          }
        };
        
        // Eğer issues yüklendiyse ve ID'yi içeriyorsa, zaten listelerde var demektir
        // Değilse, direkt olarak çekelim
        const existingIssue = issues.find(issue => issue.id === issueId);
        if (existingIssue) {
          setCurrentIssue(existingIssue);
          setIsViewModalOpen(true);
        } else if (!isLoading) { // Sayfa yüklemesi bitince direkt arızayı çek
          loadIssueDetails();
        }
      }
      
      // "open=add" parametresi varsa yeni arıza ekleme formunu aç
      if (openAddForm) {
        setIsAddModalOpen(true);
      }
      
      // "filter" parametresi varsa o duruma göre filtrele
      if (filterStatus) {
        setSelectedStatus(filterStatus);
      }
    }
  }, [issues, isLoading, loadIssues]);

  // Filtre based on search term, status, and device type
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

  const handleDeleteIssue = async (issueId: string) => {
    if (!window.confirm("Bu arıza kaydını silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      const { error } = await deleteIssue(issueId);
      if (error) throw error;
      
      // UI'dan arızayı kaldır (optimistic update)
      setIssues(issues.filter(issue => issue.id !== issueId));
    } catch (error) {
      console.error('Arıza kaydı silinirken hata oluştu:', error);
      alert('Arıza kaydı silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const viewIssueDetails = (issue: IssueData) => {
    setCurrentIssue(issue);
    setIsViewModalOpen(true);
    
    // URL'i güncelle (tarayıcı geçmişine ekleyerek)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('id', issue.id);
      window.history.pushState({}, '', url.toString());
    }
  };
  
  // Modal kapatıldığında URL'i temizle
  const closeViewModal = () => {
    setIsViewModalOpen(false);
    
    // URL'i temizle
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
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

  // Arıza ekleme başarılı olduğunda çağrılacak fonksiyon
  const handleAddSuccess = () => {
    setIsAddFormSubmitted(true);
    setIsAddModalOpen(false);
    loadIssues();
  };

  // Modal kapatma fonksiyonu  
  const closeAddModal = (e?: React.MouseEvent) => {
    // Modal açıkken ve form gönderilirken veya gönderildikten sonra
    // kazara kapanmayı önlemek için
    if (isAddFormSubmitted) {
      e?.stopPropagation();
      return;
    }
    
    if (window.confirm('Form kapatılacak. Devam etmek istiyor musunuz? Girdiğiniz bilgiler kaybolacak.')) {
      setIsAddModalOpen(false);
    }
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl font-semibold text-indigo-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen arıza verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Arıza Takip Sistemi</h1>
        <p className="mt-1 text-gray-500">Okuldaki tüm cihazların arıza kayıtlarını yönetin</p>
      </div>
      
      {/* Filtreler ve Arama */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Arıza ara
          </label>
          <input
            type="search"
            id="search"
            placeholder="Cihaz adı, arıza açıklaması veya oda numarası ile ara"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => openAddModal()}
        >
          Arıza Ekle
        </button>
      </div>
      
      {/* Arıza Tablosu */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
                Öncelik
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarih
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Arama kriterlerinize uygun arıza kaydı bulunamadı
                </td>
              </tr>
            ) : (
              filteredIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewIssueDetails(issue)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-700">{getDeviceTypeName(issue.device_type as DeviceType).charAt(0)}</span>
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status as IssueStatus)}`}>
                      {getStatusName(issue.status as IssueStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(issue.priority as IssuePriority)}`}>
                      {issue.priority === 'dusuk' ? 'Düşük' :
                        issue.priority === 'normal' ? 'Normal' :
                        issue.priority === 'yuksek' ? 'Yüksek' :
                        issue.priority === 'kritik' ? 'Kritik' : issue.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {issue.created_at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 mr-3 p-1 rounded-full hover:bg-indigo-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewIssueDetails(issue);
                      }}
                      title="Detay Görüntüle"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIssue(issue.id);
                      }}
                      title="Sil"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {isViewModalOpen && currentIssue && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="modal-content max-w-2xl mx-auto mt-20 p-5 rounded-lg shadow-lg bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Arıza Detayları</h2>
            <ViewIssueForm 
              issue={currentIssue} 
              onEdit={() => {
                setIsViewModalOpen(false);
                setIsEditModalOpen(true);
              }}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={closeViewModal}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && currentIssue && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-content max-w-2xl mx-auto mt-20 p-5 rounded-lg shadow-lg bg-white overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Arıza Düzenle</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
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
            <EditIssueForm
              issue={currentIssue}
              onSuccess={() => {
                setIsEditModalOpen(false);
                loadIssues();
              }}
              onClose={() => setIsEditModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={closeAddModal}>
          <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <AddIssueForm 
              onClose={closeAddModal} 
              onSuccess={handleAddSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
} 