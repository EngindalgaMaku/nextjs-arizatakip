'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal'; // Assuming a generic Modal component exists
import { LabType, LabTypeFormSchema, LabTypeFormValues } from '@/types/labTypes';

interface LabTypeFormModalProps {
  initialData?: LabType; // Pass full LabType object for editing
  onSubmit: (data: LabTypeFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

export function LabTypeFormModal({
  initialData,
  onSubmit,
  onClose,
  loading = false
}: LabTypeFormModalProps) {

  const isEditing = !!initialData?.id;
  const modalTitle = isEditing ? 'Laboratuvar Tipi Düzenle' : 'Yeni Laboratuvar Tipi Ekle';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LabTypeFormValues>({
    resolver: zodResolver(LabTypeFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      code: initialData?.code ?? '',
      description: initialData?.description ?? '',
    },
  });

  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Ad</label>
            <input
              id="name"
              autoFocus
              type="text"
              placeholder="Örn: Bilgisayar Laboratuvarı"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          {/* Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Kod</label>
            <input
              id="code"
              type="text"
              placeholder="Örn: bilgisayar_labi (küçük harf, boşluksuz)"
              {...register('code')}
              aria-invalid={errors.code ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.code && <p className="text-red-600 text-sm">{errors.code.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama (İsteğe Bağlı)</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Bu tipin kullanım amacı vb."
              {...register('description')}
              className={`mt-1 block w-full rounded p-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div>
        </fieldset>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isBusy ? 'Kaydediliyor...' : (isEditing ? 'Güncelle' : 'Kaydet')}
          </button>
        </div>
      </form>
    </Modal>
  );
} 