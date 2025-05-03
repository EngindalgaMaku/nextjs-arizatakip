'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// Import actions and types from the correct file
import {
  fetchLabTypes,
  createLabType,
  updateLabType,
  deleteLabType
} from '@/actions/labTypeActions';
import { LabType, LabTypeFormValues } from '@/types/labTypes';

// Import the real components
import { LabTypesTable } from '@/components/scheduling/LabTypesTable';
import { LabTypeFormModal } from '@/components/scheduling/LabTypeFormModal';

export default function LabTypesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLabType, setEditingLabType] = useState<LabType | null>(null);

  // Fetch Lab Types
  const { data: labTypes = [], isLoading, error } = useQuery<LabType[], Error>({
    queryKey: ['labTypes'],
    queryFn: fetchLabTypes,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createLabType,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['labTypes'] });
        toast.success('Laboratuvar tipi başarıyla eklendi!');
        setIsModalOpen(false);
      } else {
        toast.error(`Ekleme başarısız: ${data.error || 'Bilinmeyen hata'}`);
      }
    },
    onError: (err) => {
      toast.error(`Hata: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: LabTypeFormValues }) => updateLabType(vars.id, vars.payload),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['labTypes'] });
        toast.success('Laboratuvar tipi başarıyla güncellendi!');
        setIsModalOpen(false);
        setEditingLabType(null);
      } else {
        toast.error(`Güncelleme başarısız: ${data.error || 'Bilinmeyen hata'}`);
      }
    },
    onError: (err) => {
      toast.error(`Hata: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLabType,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['labTypes'] });
        toast.success('Laboratuvar tipi başarıyla silindi!');
      } else {
        toast.error(`Silme başarısız: ${data.error || 'Bilinmeyen hata'}`);
      }
    },
     onError: (err) => {
       toast.error(`Hata: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  // Handlers
  const handleAdd = () => {
    setEditingLabType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (labType: LabType) => {
    setEditingLabType(labType);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    // Use a confirmation dialog like sweetalert2 if available
    if (window.confirm('Bu laboratuvar tipini silmek istediğinizden emin misiniz? Bu tipe bağlı konumlar veya dersler varsa işlem başarısız olabilir.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSubmit = (data: LabTypeFormValues) => {
    if (editingLabType?.id) {
      updateMutation.mutate({ id: editingLabType.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <Link
             href="/dashboard/locations"
             className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center mb-1"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Konum Yönetimine Dön
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800">Laboratuvar Tipleri Yönetimi</h1>
        </div>
        <button
          onClick={handleAdd}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Tip Ekle
        </button>
      </div>

      {isLoading && <p>Laboratuvar tipleri yükleniyor...</p>}
      {error && <p className="text-red-600">Veriler yüklenirken bir hata oluştu: {error.message}</p>}

      {!isLoading && !error && (
        <LabTypesTable
          labTypes={labTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isModalOpen && (
        <LabTypeFormModal
          initialData={editingLabType ?? undefined}
          onSubmit={handleFormSubmit}
          onClose={() => {
              setIsModalOpen(false);
              setEditingLabType(null);
          }}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 