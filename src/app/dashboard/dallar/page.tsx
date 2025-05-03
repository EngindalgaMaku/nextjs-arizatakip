'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDallar, createDal, updateDal, deleteDal, fetchBranchesForSelect } from '@/actions/dalActions';
import { DallarTable } from '@/components/dallar/DallarTable';
import { DalFormModal } from '@/components/dallar/DalFormModal';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Dal, DalFormValues } from '@/types/dallar';

// Simple type matching the one expected by the modal
interface BranchSelectItem {
  id: string;
  name: string;
}

export default function DallarPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDal, setEditingDal] = useState<Dal | null>(null);

  // Fetch Dallar
  const { data: dallar = [], isLoading: isLoadingDallar, error: errorDallar } = useQuery<Dal[], Error>({
    queryKey: ['dallar'],
    queryFn: fetchDallar,
  });

  // --- Fetch Branches for Select --- 
  const { data: availableBranches = [], isLoading: isLoadingBranches, error: errorBranches } = useQuery<BranchSelectItem[], Error>({
    queryKey: ['branchesForSelect'], // Unique query key
    queryFn: fetchBranchesForSelect,
  });
  // --- End Fetch Branches ---

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

  // Combined loading state
  const isLoading = isLoadingDallar || isLoadingBranches;
  // Combined error state (display the first error encountered)
  const error = errorDallar || errorBranches;
  
  // Determine if the add button should be disabled
  const isAddDisabled = isLoading || availableBranches.length === 0; // Disable if loading or no branches fetched
  
  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Dal Yönetimi</h1>
        <button
          onClick={handleAdd}
          disabled={isAddDisabled} // Use combined disable logic
          title={availableBranches.length === 0 ? 'Yeni dal eklemek için önce ana dal bulunmalıdır.' : 'Yeni Dal Ekle'} // Add a title explaining why it might be disabled
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Dal Ekle
        </button>
      </div>

      {isLoading && <p>Veriler yükleniyor...</p>} {/* Updated loading message */}
      {error && <p className="text-red-600">Veriler yüklenirken bir hata oluştu: {error.message}</p>} {/* Updated error message */}
      {!isLoading && !error && availableBranches.length === 0 && (
        <p className="text-orange-600">Henüz ana dal (branch) tanımlanmamış. Yeni dal ekleyebilmek için önce ana dal eklemelisiniz.</p>
      )}

      {!isLoading && !error && dallar.length > 0 && (
        <DallarTable dallar={dallar} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {!isLoading && !error && dallar.length === 0 && availableBranches.length > 0 && (
         <p>Henüz dal tanımlanmamış.</p>
      )}

      {isModalOpen && (
        <DalFormModal
          initialData={editingDal ?? undefined}
          availableBranches={availableBranches} // <<< Pass fetched branches
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