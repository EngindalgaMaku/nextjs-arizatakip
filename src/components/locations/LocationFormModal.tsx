'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Location, LocationFormValues, LocationFormSchema } from '@/types/locations';
import { LabType } from '@/types/labTypes';
import { Branch } from '@/types/branches';
import Modal from '@/components/Modal'; // Assuming a reusable Modal component exists
// Temporary Button for fallback
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
  <button {...props} className={`px-4 py-2 border rounded text-sm inline-flex items-center justify-center ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'} ${props.variant === 'destructive' ? 'text-red-600 border-red-300 hover:bg-red-50' : 'text-gray-700 border-gray-300'}`}>
    {children}
  </button>
);
// import { Button } from '@/components/ui/button'; // Use actual button when path is confirmed

interface LocationFormModalProps {
  initialData?: Location; // Use base Location type for initial data
  availableBranches: Branch[]; // New prop for branch options
  availableLabTypes: LabType[];
  onSubmit: (data: LocationFormValues) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function LocationFormModal({
  initialData,
  availableBranches = [],
  availableLabTypes = [],
  onSubmit,
  onClose,
  isLoading = false,
}: LocationFormModalProps) {

  const isEditing = !!initialData;
  const modalTitle = isEditing ? 'Konumu Düzenle' : 'Yeni Konum Ekle';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LocationFormValues>({
    resolver: zodResolver(LocationFormSchema),
    defaultValues: {
      branch_id: initialData?.branch_id ?? '',
      name: initialData?.name ?? '',
      code: initialData?.code ?? '',
      capacity: initialData?.capacity ?? undefined, // Default to undefined if null/0 not desired
      lab_type_id: initialData?.lab_type_id ?? '', // Default to empty string or first available lab type ID
    },
  });

  const isBusy = isLoading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Branch (Required) */}
          <div>
            <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700">Branş *</label>
            <select
              key={initialData?.branch_id}
              id="branch_id"
              {...register('branch_id')}
              aria-invalid={errors.branch_id ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.branch_id ? 'border-red-500' : 'border-gray-300'}`}
              defaultValue={initialData?.branch_id ?? ''}
            >
              <option value="" disabled>-- Seçiniz --</option>
              {availableBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            {errors.branch_id && <p className="text-red-600 text-sm mt-1">{errors.branch_id.message}</p>}
          </div>

          {/* Location Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Konum Adı *</label>
            <input
              id="name"
              type="text"
              autoFocus
              placeholder="Örn: Bilişim Lab 1, 10-A Sınıfı"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          {/* Location Code (Optional) */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Konum Kodu</label>
            <input
              id="code"
              type="text"
              placeholder="Örn: BLAB1, 10A" 
              {...register('code')}
              aria-invalid={errors.code ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.code && <p className="text-red-600 text-sm">{errors.code.message}</p>}
          </div>

          {/* Capacity (Optional) */}
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">Kapasite</label>
            <input
              id="capacity"
              type="number"
              placeholder="Örn: 30"
              {...register('capacity', { valueAsNumber: true })}
              aria-invalid={errors.capacity ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.capacity ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.capacity && <p className="text-red-600 text-sm">{errors.capacity.message}</p>}
          </div>

          {/* Lab Type (Required) */}
          <div>
            <label htmlFor="lab_type_id" className="block text-sm font-medium text-gray-700">Laboratuvar Tipi *</label>
            <select
              id="lab_type_id"
              {...register('lab_type_id')}
              aria-invalid={errors.lab_type_id ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.lab_type_id ? 'border-red-500' : 'border-gray-300'}`}
              defaultValue={initialData?.lab_type_id ?? ''}
            >
              <option value="" disabled>-- Seçiniz --</option>
              {availableLabTypes.map(labType => (
                <option key={labType.id} value={labType.id}>
                  {labType.name} ({labType.code})
                </option>
              ))}
            </select>
             {availableLabTypes.length === 0 && <p className="text-sm text-gray-500 mt-1">Uygun laboratuvar tipi bulunamadı. Lütfen önce laboratuvar tiplerini tanımlayın.</p>}
            {errors.lab_type_id && <p className="text-red-600 text-sm">{errors.lab_type_id.message}</p>}
          </div>
        </fieldset>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline" 
            onClick={onClose}
            disabled={isBusy}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isBusy}
          >
            {isBusy ? 'Kaydediliyor...' : (isEditing ? 'Güncelle' : 'Kaydet')}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 