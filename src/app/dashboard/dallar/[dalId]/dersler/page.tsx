'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDalById } from '@/actions/dalActions'; // We need this to get the Dal name
import { fetchDalDersleri, createDalDers, updateDalDers, deleteDalDers } from '@/actions/dalDersActions';
import { DalDersleriYonetim } from '@/components/dallar/DalDersleriYonetim';
import { DalDersFormModal } from '@/components/dallar/DalDersFormModal';
import { DalDers, DalDersFormValues, SinifSeviyesi } from '@/types/dalDersleri';
import { Dal } from '@/types/dallar';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

export default function DalDersleriPage() {
  const params = useParams();
  const dalId = params.dalId as string;
  const queryClient = useQueryClient();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDers, setEditingDers] = useState<DalDers | null>(null);
  const [selectedSinif, setSelectedSinif] = useState<SinifSeviyesi | null>(null);

  // Fetch Dal details for title
  const { data: dal, isLoading: isLoadingDal } = useQuery<Dal | null, Error>({
    queryKey: ['dal', dalId],
    queryFn: () => fetchDalById(dalId), // Add fetchDalById to dalActions
    enabled: !!dalId,
  });

  // Fetch lessons for this Dal
  const { data: dersler = [], isLoading: isLoadingDersler, error } = useQuery<DalDers[], Error>({
    queryKey: ['dalDersleri', dalId],
    queryFn: () => fetchDalDersleri(dalId),
    enabled: !!dalId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: DalDersFormValues) => createDalDers(dalId, payload),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
        toast.success('Ders başarıyla eklendi!');
        setIsModalOpen(false);
      } else {
        toast.error(`Ders eklenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Ders eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { dersId: string; payload: DalDersFormValues }) => updateDalDers(vars.dersId, vars.payload),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
        toast.success('Ders başarıyla güncellendi!');
        setIsModalOpen(false);
        setEditingDers(null);
      } else {
        toast.error(`Ders güncellenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
       toast.error(`Ders güncellenemedi: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDalDers,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
        toast.success('Ders başarıyla silindi!');
      } else {
        toast.error(`Ders silinemedi: ${data.error}`);
      }
    },
     onError: (err) => {
       toast.error(`Ders silinemedi: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  // Handlers
  const handleAdd = (sinifSeviyesi: SinifSeviyesi) => {
    setEditingDers(null);
    setSelectedSinif(sinifSeviyesi);
    setIsModalOpen(true);
  };

  const handleEdit = (ders: DalDers) => {
    setEditingDers(ders);
    setSelectedSinif(ders.sinifSeviyesi);
    setIsModalOpen(true);
  };

  const handleDelete = (dersId: string) => {
    if (window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(dersId);
    }
  };

  const handleFormSubmit = (data: DalDersFormValues) => {
    if (editingDers?.id) {
      updateMutation.mutate({ dersId: editingDers.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = isLoadingDal || isLoadingDersler;
  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const pageTitle = isLoadingDal ? 'Dal Yükleniyor...' : dal ? `${dal.name} - Ders Yönetimi` : 'Dal Bulunamadı';

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{pageTitle}</h1>
        <Link
           href="/dashboard/dallar"
           className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Dal Listesine Dön
        </Link>
      </div>

      {isLoading && <p>Dersler yükleniyor...</p>}
      {error && <p className="text-red-600">Dersler yüklenirken bir hata oluştu: {error.message}</p>}

      {!isLoading && !error && (
        <DalDersleriYonetim 
          dersler={dersler}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isModalOpen && selectedSinif && (
        <DalDersFormModal
          // Pass only dersAdi and haftalikSaat for editing
          initialData={editingDers ? { sinifSeviyesi: editingDers.sinifSeviyesi, dersAdi: editingDers.dersAdi, haftalikSaat: editingDers.haftalikSaat } : { sinifSeviyesi: selectedSinif, dersAdi: '', haftalikSaat: 0 }}
          sinifSeviyesi={selectedSinif}
          onSubmit={handleFormSubmit}
          onClose={() => {
              setIsModalOpen(false);
              setEditingDers(null);
              setSelectedSinif(null);
          }}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 