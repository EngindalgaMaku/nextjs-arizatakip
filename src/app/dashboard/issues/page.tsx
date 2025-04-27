'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getIssues, deleteIssue, Issue, DeviceType, DeviceLocation, IssueStatus, IssuePriority, getIssue } from '@/lib/supabase';
import AddIssueForm from './add-form';
import EditIssueForm from './edit-form';
import ViewIssueForm from './view-issue-form';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { NotificationTestButton } from '@/components/dashboard/NotificationTestButton';

interface IssueData extends Omit<Issue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null; 
}

// IssueList component that encapsulates the issue list functionality
const IssueList = ({ selectedId, onSelectIssue }: { selectedId?: string | null, onSelectIssue?: (issue: IssueData | null) => void }) => {
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
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

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
      setTotalPages(pages || 1); // Eğer pages değeri 0 ise, en az 1 sayfa olmalı
      setTotalCount(count || 0);
      
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
  
  // Supabase realtime aboneliği
  useEffect(() => {
    console.log('Admin realtime aboneliği kuruluyor...');
    
    const issueSubscription = supabase
      .channel('admin-issues-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'issues'
        },
        (payload) => {
          console.log('Yeni arıza bildirimi alındı:', payload);
          const newIssue = payload.new as Issue;
          
          // Listeyi güncelle
          loadIssues();
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
      });
    
    return () => {
      console.log('Realtime aboneliği sonlandırılıyor...');
      if (issueSubscription) {
        supabase.removeChannel(issueSubscription);
      }
    };
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
      const filterReporter = params.get('reporter');
      
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

      // "reporter" parametresi varsa gönderene göre filtrele
      if (filterReporter) {
        setSelectedReporter(filterReporter);
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
      {/* ... existing UI code ... */}
    </div>
  );
};

export default function IssuesPage() {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Arıza Bildirimleri</h1>
        <div className="flex gap-2">
          <NotificationTestButton />
        </div>
      </div>
      <IssueList selectedId={selectedId} onSelectIssue={setSelectedIssue} />
    </div>
  );
} 