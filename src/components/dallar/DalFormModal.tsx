'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { DalFormSchema, DalFormValues, Dal } from '@/types/dallar';

interface DalFormModalProps {
  initialData?: Dal; // Pass full Dal object for editing context
  onSubmit: (data: DalFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

export function DalFormModal({ initialData, onSubmit, onClose, loading = false }: DalFormModalProps) {
  const isEditing = !!initialData?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DalFormValues>({
    resolver: zodResolver(DalFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
    },
  });

  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Dalı Düzenle' : 'Yeni Dal Ekle'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Dal Name */}
          <div>
            <label htmlFor="dalName" className="block text-sm font-medium text-gray-700">Dal Adı</label>
            <input
              id="dalName"
              autoFocus
              type="text"
              placeholder="Örn: Bilişim Teknolojileri"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama (Opsiyonel)</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Dal hakkında kısa açıklama..."
              {...register('description')}
              className={`mt-1 block w-full rounded p-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div>

        </fieldset>
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} disabled={isBusy} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            İptal
          </button>
          <button type="submit" disabled={isBusy} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {isBusy ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
} 