'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDalById } from '@/actions/dalActions'; // We need this to get the Dal name
import { fetchDalDersleri, createDalDers, updateDalDers, deleteDalDers } from '@/actions/dalDersActions';
import { fetchLabTypes, fetchDalDersLabTypes, setDalDersLabTypes } from '@/actions/labTypeActions'; // Import Lab Type actions
import { DalDersleriYonetim } from '@/components/dallar/DalDersleriYonetim';
import { DalDersFormModal } from '@/components/dallar/DalDersFormModal';
import { DalDers, DalDersFormValues, SinifSeviyesi } from '@/types/dalDersleri';
import { Dal } from '@/types/dallar';
import { LabType } from '@/types/labTypes'; // Import LabType
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import * as z from 'zod';

export default function DalDersleriPage() {
  const params = useParams();
  const dalId = params.dalId as string;
  const queryClient = useQueryClient();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDers, setEditingDers] = useState<DalDers | null>(null);
  const [selectedSinif, setSelectedSinif] = useState<SinifSeviyesi | null>(null);
  const [selectedLabTypeIds, setSelectedLabTypeIds] = useState<string[]>([]); // State for selected lab types in modal

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

  // Fetch all available Lab Types for the modal dropdown
  const { data: labTypes = [], isLoading: isLoadingLabTypes } = useQuery<LabType[], Error>({
    queryKey: ['labTypes'],
    queryFn: fetchLabTypes,
  });

  // Fetch associated lab types when editing a lesson
  useEffect(() => {
    if (isModalOpen && editingDers?.id) {
      fetchDalDersLabTypes(editingDers.id).then(ids => {
        setSelectedLabTypeIds(ids);
      });
    } else {
      setSelectedLabTypeIds([]); // Reset when opening for add or closing
    }
  }, [isModalOpen, editingDers]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (vars: { payload: DalDersFormValues; labTypeIds: string[] }) => createDalDers(dalId, vars.payload, vars.labTypeIds),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
        toast.success('Ders başarıyla eklendi!');
        if (data.partialError) {
            toast.warn(data.partialError);
        }
        setIsModalOpen(false);
      } else {
        const errorMessage = typeof data.error === 'string' ? data.error : (data.error as z.ZodIssue[]).map(e => e.message).join(', ');
        toast.error(`Ders eklenemedi: ${errorMessage}`);
      }
    },
    onError: (err) => {
      toast.error(`Ders eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { dersId: string; payload: DalDersFormValues; labTypeIds: string[] }) => updateDalDers(vars.dersId, vars.payload, vars.labTypeIds),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
        toast.success('Ders başarıyla güncellendi!');
        if (data.partialError) {
            toast.warn(data.partialError);
        }
        setIsModalOpen(false);
        setEditingDers(null);
      } else {
        const errorMessage = typeof data.error === 'string' ? data.error : (data.error as z.ZodIssue[]).map(e => e.message).join(', ');
        toast.error(`Ders güncellenemedi: ${errorMessage}`);
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

  const handleFormSubmit = (data: DalDersFormValues & { suitableLabTypeIds?: string[] }) => {
    // Log the full data received from the modal
    console.log('[DalDersleriPage] handleFormSubmit called with data:', data);
    
    const payload = { 
        dersAdi: data.dersAdi,
        haftalikSaat: data.haftalikSaat,
        sinifSeviyesi: data.sinifSeviyesi,
        bolunebilir_mi: data.bolunebilir_mi, // Ensure this is included
        cizelgeye_dahil_et: data.cizelgeye_dahil_et, // Ensure this is included
        requires_multiple_resources: data.requires_multiple_resources, // Ensure this is included
    };
    const labTypeIdsToSave = data.suitableLabTypeIds || []; 
    
    console.log("[DalDersleriPage] Prepared Payload:", payload);
    console.log("[DalDersleriPage] requires_multiple_resources value in payload:", payload.requires_multiple_resources);
    console.log("[DalDersleriPage] Lab Types to Save:", labTypeIdsToSave);

    if (editingDers?.id) {
      console.log('[DalDersleriPage] Calling updateMutation...');
      updateMutation.mutate({ dersId: editingDers.id, payload, labTypeIds: labTypeIdsToSave });
    } else {
      console.log('[DalDersleriPage] Calling createMutation...');
      createMutation.mutate({ payload, labTypeIds: labTypeIdsToSave });
    }
  };

  const isLoading = isLoadingDal || isLoadingDersler || isLoadingLabTypes;
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
          initialData={editingDers ? { 
              sinifSeviyesi: editingDers.sinifSeviyesi, 
              dersAdi: editingDers.dersAdi, 
              haftalikSaat: editingDers.haftalikSaat,
              bolunebilir_mi: editingDers.bolunebilir_mi,
              cizelgeye_dahil_et: editingDers.cizelgeye_dahil_et,
              requires_multiple_resources: editingDers.requires_multiple_resources,
           } : { 
              sinifSeviyesi: selectedSinif, 
              dersAdi: '', 
              haftalikSaat: 0,
              bolunebilir_mi: true,
              cizelgeye_dahil_et: true,
              requires_multiple_resources: false,
           }}
          sinifSeviyesi={selectedSinif}
          onSubmit={handleFormSubmit}
          onClose={() => {
              setIsModalOpen(false);
              setEditingDers(null);
              setSelectedSinif(null);
          }}
          loading={mutationLoading}
          availableLabTypes={labTypes}
          initialLabTypeIds={selectedLabTypeIds}
        />
      )}
    </div>
  );
} 