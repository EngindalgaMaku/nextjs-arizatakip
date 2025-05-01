'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDallar, createDal, updateDal, deleteDal } from '@/actions/dalActions';
import { DallarTable } from '@/components/dallar/DallarTable';
import { DalFormModal } from '@/components/dallar/DalFormModal';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Dal, DalFormValues } from '@/types/dallar';

export default function DallarPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDal, setEditingDal] = useState<Dal | null>(null);

  // Fetch Dallar
  const { data: dallar = [], isLoading, error } = useQuery<Dal[], Error>({ 
    queryKey: ['dallar'],
    queryFn: fetchDallar,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createDal,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dallar'] });
        toast.success('Dal başarıyla eklendi!');
        setIsModalOpen(false);
      } else {
        toast.error(`Dal eklenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Dal eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Create dal error:", err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: DalFormValues }) => updateDal(vars.id, vars.payload),
    onSuccess: (data) => {
       if (data.success) {
          queryClient.invalidateQueries({ queryKey: ['dallar'] });
          toast.success('Dal başarıyla güncellendi!');
          setIsModalOpen(false);
          setEditingDal(null);
       } else {
          toast.error(`Dal güncellenemedi: ${data.error}`);
       }
    },
    onError: (err, variables) => {
       toast.error(`Dal güncellenemedi: ${err instanceof Error ? err.message : String(err)}`);
       console.error(`Update dal error (ID: ${variables.id}):`, err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDal,
    onSuccess: (data, dalId) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dallar'] });
        toast.success('Dal başarıyla silindi!');
      } else {
         toast.error(`Dal silinemedi: ${data.error}`);
         // TODO: Handle potential foreign key errors more gracefully
      }
    },
    onError: (err, dalId) => {
       toast.error(`Dal silinemedi: ${err instanceof Error ? err.message : String(err)}`);
       console.error(`Delete dal error (ID: ${dalId}):`, err);
    },
  });

  // Handlers
  const handleAdd = () => {
    setEditingDal(null);
    setIsModalOpen(true);
  };

  const handleEdit = (dal: Dal) => {
    setEditingDal(dal);
    setIsModalOpen(true);
  };

  const handleDelete = (dalId: string) => {
    if (window.confirm('Bu dalı silmek istediğinizden emin misiniz? Bu dala bağlı ders tanımları varsa silinemeyebilir.')) {
      deleteMutation.mutate(dalId);
    }
  };

  const handleFormSubmit = (data: DalFormValues) => {
    if (editingDal?.id) {
       updateMutation.mutate({ id: editingDal.id, payload: data });
    } else {
       createMutation.mutate(data);
    }
  };

  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Dal Yönetimi</h1>
        <button
          onClick={handleAdd}
          disabled={isLoading} // Disable button while loading initial data
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Dal Ekle
        </button>
      </div>

      {isLoading && <p>Dallar yükleniyor...</p>}
      {error && <p className="text-red-600">Dallar yüklenirken bir hata oluştu: {error.message}</p>}

      {!isLoading && !error && (
        <DallarTable dallar={dallar} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {isModalOpen && (
        <DalFormModal
          initialData={editingDal ?? undefined}
          onSubmit={handleFormSubmit}
          onClose={() => {
              setIsModalOpen(false);
              setEditingDal(null);
          }}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 