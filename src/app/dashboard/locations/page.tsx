'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLocations, createLocation, updateLocation, deleteLocation, fetchLocationById } from '@/actions/locationActions'; // Import fetchLocationById
import { fetchLabTypes } from '@/actions/labTypeActions';
import { LocationWithLabType, LocationFormValues, Location } from '@/types/locations';
import { LabType } from '@/types/labTypes';
import LocationsTable from '@/components/locations/LocationsTable'; // Use default import
import { LocationFormModal } from '@/components/locations/LocationFormModal'; // Assume this will be created
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import * as z from 'zod';
import Link from 'next/link'; // Import Link component
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'; // Import icon for the button

export default function LocationsPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null); // Use Location type for editing

    // Fetch Locations with Lab Type info
    const { data: locations = [], isLoading: isLoadingLocations, error: locationsError } = useQuery<
        LocationWithLabType[],
        Error
    >({
        queryKey: ['locations'],
        queryFn: fetchLocations,
    });

    // Fetch Lab Types for the modal dropdown
    const { data: labTypes = [], isLoading: isLoadingLabTypes, error: labTypesError } = useQuery<
        LabType[],
        Error
    >({
        queryKey: ['labTypes'],
        queryFn: fetchLabTypes,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createLocation,
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['locations'] });
                toast.success('Konum başarıyla eklendi!');
                setIsModalOpen(false);
      } else {
                const errorMessage = typeof data.error === 'string' ? data.error : (data.error as z.ZodIssue[]).map(e => e.message).join(', ');
                toast.error(`Konum eklenemedi: ${errorMessage}`);
            }
        },
        onError: (err) => {
            toast.error(`Konum eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (vars: { id: string; payload: LocationFormValues }) => updateLocation(vars.id, vars.payload),
        onSuccess: (data, variables) => {
             if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['locations'] });
                // Optional: update the specific item query if needed
                // queryClient.invalidateQueries({ queryKey: ['location', variables.id] });
                toast.success('Konum başarıyla güncellendi!');
                setIsModalOpen(false);
        setEditingLocation(null);
      } else {
                const errorMessage = typeof data.error === 'string' ? data.error : (data.error as z.ZodIssue[]).map(e => e.message).join(', ');
                toast.error(`Konum güncellenemedi: ${errorMessage}`);
            }
        },
        onError: (err) => {
           toast.error(`Konum güncellenemedi: ${err instanceof Error ? err.message : String(err)}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteLocation,
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['locations'] });
                toast.success('Konum başarıyla silindi!');
      } else {
                toast.error(`Konum silinemedi: ${data.error}`);
            }
        },
         onError: (err) => {
           toast.error(`Konum silinemedi: ${err instanceof Error ? err.message : String(err)}`);
        },
    });

    // Handlers
    const handleAdd = () => {
        setEditingLocation(null); // Ensure we are not in edit mode
        setIsModalOpen(true);
    };

    const handleEdit = (location: LocationWithLabType) => {
        // Extract base Location data for the form
        const baseLocation: Location = {
            id: location.id,
            name: location.name,
            code: location.code,
            capacity: location.capacity,
            lab_type_id: location.lab_type_id,
            // created_at and updated_at are omitted as they are not form fields
        };
        setEditingLocation(baseLocation);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bu konumu silmek istediğinizden emin misiniz?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleFormSubmit = (data: LocationFormValues) => {
        if (editingLocation?.id) {
            updateMutation.mutate({ id: editingLocation.id, payload: data });
    } else {
            createMutation.mutate(data);
        }
    };

    const isLoading = isLoadingLocations || isLoadingLabTypes;
    const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    // Error Handling for Queries
    const renderError = (error: Error | null, type: string) => {
      if (!error) return null;
      return <div className="text-red-500 p-4 bg-red-100 border border-red-400 rounded mb-4">{type} yüklenirken hata oluştu: {error.message}</div>;
  }

  return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Konum Yönetimi</h1>
                {/* Button Group */}
                <div className="flex space-x-2">
                     {/* Manage Lab Types Button */}
                    <Link
                      href="/dashboard/lab-types"
                      className="inline-flex items-center px-4 py-2 border border-teal-300 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 text-sm font-medium disabled:opacity-50"
                    >
                      <BuildingOffice2Icon className="h-5 w-5 mr-2" />
                      Laboratuvar Tiplerini Yönet
                    </Link>
                    {/* Add New Location Button */}
                    <button onClick={handleAdd} disabled={isLoading || mutationLoading} className="inline-flex items-center px-4 py-2 border border-teal-300 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 text-sm font-medium disabled:opacity-50">
                        <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Konum Ekle
        </button>
      </div>
            </div>

            {renderError(locationsError, 'Konumlar')}
            {renderError(labTypesError, 'Laboratuvar Tipleri')}

            {isLoading ? (
                 <div className="text-center p-6">Yükleniyor...</div>
            ) : (
                 locations && locations.length > 0 ? (
                    <LocationsTable
                        locations={locations}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isLoading={mutationLoading}
                    />
                 ) : (
                    !locationsError && <div className="text-center p-6 bg-gray-50 rounded">Henüz konum eklenmemiş.</div>
                 )
            )}

            {isModalOpen && (
                <LocationFormModal
                    initialData={editingLocation ?? undefined}
                    availableLabTypes={labTypes}
                    onSubmit={handleFormSubmit}
              onClose={() => {
                        setIsModalOpen(false);
                setEditingLocation(null);
              }}
                    isLoading={mutationLoading}
        />
      )}
    </div>
  );
} 