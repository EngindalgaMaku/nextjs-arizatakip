'use client';

import { useState, useEffect, useCallback } from 'react';
import { getIssues, deleteIssue, Issue, DeviceType, DeviceLocation, IssueStatus, IssuePriority, getIssue } from '@/lib/supabase';
import AddIssueForm from './add-form';
import EditIssueForm from './edit-form';
import ViewIssueForm from './view-issue-form';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

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
  const [selectedReporter, setSelectedReporter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<IssueData | null>(null);
  const [isAddFormSubmitted, setIsAddFormSubmitted] = useState(false);
  // Sayfalama için state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Arızaları yükle
  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Gerçek API çağrısı yap - sayfalama ile
      const { data, error, totalPages: pages, totalCount: count } = await getIssues(currentPage, pageSize);
      
      if (error) {
        console.error('Supabase veri çekme hatası:', error);
        throw error;
      }
      
      // Toplam sayfa ve kayıt sayısını güncelle
      setTotalPages(pages);
      setTotalCount(count);
      
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
      Swal.fire({
        title: 'Hata!',
        text: 'Arızalar yüklenirken bir hata oluştu. Lütfen Supabase ayarlarınızı kontrol edin veya yönetici ile iletişime geçin.',
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
      // Boş liste göster
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);
  
  // Sayfa değiştiğinde işlemler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
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
              Swal.fire({
                title: 'Hata!',
                text: 'Arıza detayları yüklenirken bir hata oluştu.',
                icon: 'error',
                confirmButtonText: 'Tamam'
              });
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
    const matchesReporter = selectedReporter === 'all' || issue.reported_by === selectedReporter;
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation && matchesReporter;
  });

  const handleDeleteIssue = async (issueId: string) => {
    Swal.fire({
      title: 'Bu arıza kaydını silmek istediğinizden emin misiniz?',
      text: 'Bu işlem geri alınamaz!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, sil',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { error } = await deleteIssue(issueId);
          if (error) throw error;
          
          // UI'dan arızayı kaldır (optimistic update)
          setIssues(issues.filter(issue => issue.id !== issueId));
          
          Swal.fire({
            title: 'Başarılı!',
            text: 'Arıza kaydı başarıyla silindi',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (error) {
          console.error('Arıza kaydı silinirken hata oluştu:', error);
          Swal.fire({
            title: 'Hata!',
            text: 'Arıza kaydı silinirken bir hata oluştu. Lütfen tekrar deneyin.',
            icon: 'error',
            confirmButtonText: 'Tamam'
          });
        }
      }
    });
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS</h1>
        <p className="text-gray-500 text-sm sm:text-base">Okuldaki tüm cihazların arıza kayıtlarını yönetin</p>
      </div>
      
      {/* Filtreler ve Arama - Mobil Responsive */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div className="w-full md:w-1/2 mb-4 md:mb-0">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Arama
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="search"
                id="search"
                placeholder="Cihaz adı, açıklama, oda numarası veya gönderen"
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center w-full md:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => openAddModal()}
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Arıza Ekle
          </button>
        </div>
        
        {/* Filtreler - Mobil için açılır/kapanır tasarım */}
        <div className="mt-4">
          <details className="md:hidden">
            <summary className="text-sm font-medium text-indigo-600 cursor-pointer p-2 border rounded-md hover:bg-indigo-50 transition-colors">
              Filtreleme Seçenekleri
            </summary>
            <div className="mt-3 space-y-3 p-3 border rounded-md bg-gray-50">
              <div>
                <label htmlFor="mobile-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Durum
                </label>
                <select
                  id="mobile-status"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              </div>
              
              <div>
                <label htmlFor="mobile-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Cihaz Türü
                </label>
                <select
                  id="mobile-type"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              </div>
              
              <div>
                <label htmlFor="mobile-location" className="block text-sm font-medium text-gray-700 mb-1">
                  Konum
                </label>
                <select
                  id="mobile-location"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              </div>
              
              <div>
                <label htmlFor="mobile-reporter" className="block text-sm font-medium text-gray-700 mb-1">
                  Gönderen
                </label>
                <select
                  id="mobile-reporter"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={selectedReporter}
                  onChange={(e) => setSelectedReporter(e.target.value)}
                >
                  <option value="all">Tüm Gönderenler</option>
                  {Array.from(new Set(issues.map(issue => issue.reported_by))).sort().map(reporter => (
                    <option key={reporter} value={reporter}>{reporter}</option>
                  ))}
                </select>
              </div>
              
              <button 
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedType('all');
                  setSelectedLocation('all');
                  setSelectedReporter('all');
                }}
                className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Filtreleri Sıfırla
              </button>
            </div>
          </details>
          
          {/* Masaüstü için yatay filtreler */}
          <div className="hidden md:grid md:grid-cols-5 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                id="status"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Cihaz Türü
              </label>
              <select
                id="type"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Konum
              </label>
              <select
                id="location"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            </div>
            
            <div>
              <label htmlFor="reporter" className="block text-sm font-medium text-gray-700 mb-1">
                Gönderen
              </label>
              <select
                id="reporter"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={selectedReporter}
                onChange={(e) => setSelectedReporter(e.target.value)}
              >
                <option value="all">Tüm Gönderenler</option>
                {Array.from(new Set(issues.map(issue => issue.reported_by))).sort().map(reporter => (
                  <option key={reporter} value={reporter}>{reporter}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button 
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedType('all');
                  setSelectedLocation('all');
                  setSelectedReporter('all');
                }}
                className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Filtreleri Sıfırla
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Arıza İçeriği */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredIssues.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Arıza kaydı bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedStatus !== 'all' || selectedType !== 'all' || selectedLocation !== 'all' || selectedReporter !== 'all' 
                ? 'Arama kriterlerinize uygun arıza kaydı bulunamadı' 
                : 'Henüz arıza kaydı bulunmamaktadır'}
            </p>
          </div>
        ) : (
          <>
            {/* Masaüstü Tablo Görünümü - md boyutundan büyük ekranlar için */}
            <div className="hidden md:block">
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
                      Gönderen
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
                  {filteredIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewIssueDetails(issue)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-700">{getDeviceTypeName(issue.device_type as any).charAt(0)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{issue.device_name}</div>
                            <div className="text-sm text-gray-500">{getDeviceTypeName(issue.device_type as any)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getLocationName(issue.device_location as any)}</div>
                        <div className="text-sm text-gray-500">{issue.room_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{issue.reported_by}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status as any)}`}>
                          {getStatusName(issue.status as any)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(issue.priority as any)}`}>
                          {(issue.priority as any) === 'dusuk' ? 'Düşük' :
                            (issue.priority as any) === 'normal' ? 'Normal' :
                            (issue.priority as any) === 'yuksek' ? 'Yüksek' :
                            (issue.priority as any) === 'kritik' ? 'Kritik' : issue.priority}
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
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobil Kart Görünümü - md boyutundan küçük ekranlar için */}
            <div className="md:hidden">
              <ul className="divide-y divide-gray-200">
                {filteredIssues.map((issue) => (
                  <li key={issue.id} className="px-4 py-4">
                    <div 
                      className="bg-white overflow-hidden border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      onClick={() => viewIssueDetails(issue)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                              <span className="text-indigo-700 font-medium">{getDeviceTypeName(issue.device_type as any).charAt(0)}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{issue.device_name}</div>
                              <div className="text-xs text-gray-500">{getDeviceTypeName(issue.device_type as any)}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(issue.status as any)}`}>
                            {getStatusName(issue.status as any)}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap text-sm text-gray-500 mt-2">
                          <div className="w-1/2 mb-1">
                            <span className="font-medium">Konum:</span> {getLocationName(issue.device_location as any)} ({issue.room_number})
                          </div>
                          <div className="w-1/2 mb-1">
                            <span className="font-medium">Öncelik:</span> <span className={`px-1.5 py-0.5 rounded-full text-xs ${getPriorityColor(issue.priority as any)}`}>
                              {(issue.priority as any) === 'dusuk' ? 'Düşük' :
                                (issue.priority as any) === 'normal' ? 'Normal' :
                                (issue.priority as any) === 'yuksek' ? 'Yüksek' :
                                (issue.priority as any) === 'kritik' ? 'Kritik' : issue.priority}
                            </span>
                          </div>
                          <div className="w-full mb-1">
                            <span className="font-medium">Oluşturan:</span> {issue.reported_by}
                          </div>
                          <div className="w-full">
                            <span className="font-medium">Tarih:</span> {issue.created_at}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                          <button
                            className="p-2 rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewIssueDetails(issue);
                            }}
                            title="Detay Görüntüle"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteIssue(issue.id);
                            }}
                            title="Sil"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Pagination */}
            {(searchTerm === '' && selectedStatus === 'all' && selectedType === 'all' && selectedLocation === 'all' && selectedReporter === 'all') && totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Toplam <span className="font-medium">{totalCount}</span> arıza kaydından{' '}
                      <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>-
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, totalCount)}
                      </span>{' '}
                      arası gösteriliyor
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === 1 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Önceki</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Sayfa numaraları */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Sayfa numaralarını akıllıca hesapla
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Sonraki</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
                
                {/* Mobil pagination */}
                <div className="flex sm:hidden justify-between items-center">
                  <p className="text-sm text-gray-700">
                    Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Önceki
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                        currentPage === totalPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Modal */}
      {isViewModalOpen && currentIssue && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="modal-content max-w-2xl mx-auto mt-4 sm:mt-20 p-4 sm:p-5 rounded-lg shadow-lg bg-white overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold">Arıza Detayları</h2>
              <button
                onClick={closeViewModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ViewIssueForm 
              issue={currentIssue} 
              onEdit={() => {
                setIsViewModalOpen(false);
                setIsEditModalOpen(true);
              }}
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeViewModal}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 mr-2"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                Düzenle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && currentIssue && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-content max-w-2xl mx-auto mt-4 sm:mt-20 p-4 sm:p-5 rounded-lg shadow-lg bg-white overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold">Arıza Düzenle</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
          <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Yeni Arıza Ekle</h2>
              <button
                onClick={closeAddModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <AddIssueForm 
                onClose={closeAddModal} 
                onSuccess={handleAddSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 