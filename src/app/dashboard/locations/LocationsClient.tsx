'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLocations, fetchLocationsByBranch, createLocation, updateLocation, deleteLocation } from '@/actions/locationActions';
import { fetchBranches } from '@/actions/branchActions';
import { fetchLabTypes } from '@/actions/labTypeActions';
import LocationsTable from '@/components/locations/LocationsTable';
import { LocationFormModal } from '@/components/locations/LocationFormModal';
import { Location, LocationFormValues } from '@/types/locations';
import { Branch } from '@/types/branches';
import { LabType } from '@/types/labTypes';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useSemesterStore } from '@/stores/useSemesterStore';

export default function LocationsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchId = searchParams.get('branchId') || '';
  const queryClient = useQueryClient();
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Fetch branches
  const { data: branches = [], isLoading: loadingBranches } = useQuery<Branch[], Error>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  // Default branch filter
  useEffect(() => {
    if (!branchId && !loadingBranches && branches.length) {
      const defaultBranch = branches.find(b => b.name === 'Bilişim Teknolojileri');
      if (defaultBranch) {
        router.replace(`/dashboard/locations?branchId=${defaultBranch.id}`);
      }
    }
  }, [branchId, branches, loadingBranches, router]);

  // Fetch locations
  const { data: locations = [], isLoading: loadingLocations } = useQuery<Location[], Error>({
    queryKey: branchId
      ? ['locations', branchId, selectedSemesterId]
      : ['locations', selectedSemesterId],
    queryFn: () => branchId
      ? fetchLocationsByBranch(branchId, selectedSemesterId ?? undefined)
      : fetchLocations(selectedSemesterId ?? undefined),
    enabled: !!selectedSemesterId,
  });

  // Fetch lab types
  const { data: labTypes = [], isLoading: loadingLabTypes } = useQuery<LabType[], Error>({
    queryKey: ['labTypes'],
    queryFn: fetchLabTypes,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Konum eklendi!');
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        setIsModalOpen(false);
      } else {
        toast.error(`Ekleme hatası: ${res.error}`);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LocationFormValues }) => updateLocation(id, payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Konum güncellendi!');
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        setIsModalOpen(false);
      } else {
        toast.error(`Güncelleme hatası: ${res.error}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Konum silindi!');
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      } else {
        toast.error(`Silme hatası: ${res.error}`);
      }
    },
  });

  // Handlers
  const handleAdd = () => setIsModalOpen(true);
  const handleEdit = (loc: Location) => { setEditingLocation(loc); setIsModalOpen(true); };
  const handleDelete = (id: string) => { if (confirm('Silmek istediğinize emin misiniz?')) deleteMutation.mutate(id); };
  const handleSubmit = (data: LocationFormValues) => {
    if (editingLocation?.id) updateMutation.mutate({ id: editingLocation.id, payload: data });
    else createMutation.mutate(data);
  };

  const isLoading = loadingLocations || loadingBranches;
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Konum Yönetimi</h1>
        <button onClick={handleAdd} disabled={isLoading} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          <PlusIcon className="w-5 h-5 mr-2" /> Yeni Konum
        </button>
      </div>
      {!isLoading && (
        <select value={branchId} onChange={e => router.push(`/dashboard/locations?branchId=${e.target.value}`)} className="border p-1 mb-4">
          <option value="">Tümü</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      {!selectedSemesterId && !isLoading && (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          Lütfen işlem yapmak için kenar çubuğundan bir sömestr seçin.
        </div>
      )}
      {isLoading ? (
        <p>Yükleniyor...</p>
      ) : selectedSemesterId ? (
        <LocationsTable locations={locations} onEdit={handleEdit} onDelete={handleDelete} />
      ) : null}
      {isModalOpen && (
        <LocationFormModal
          initialData={editingLocation ?? undefined}
          availableBranches={branches}
          availableLabTypes={labTypes}
          onSubmit={handleSubmit}
          onClose={() => { setIsModalOpen(false); setEditingLocation(null); }}
          isLoading={isMutating}
        />
      )}
    </div>
  );
} 