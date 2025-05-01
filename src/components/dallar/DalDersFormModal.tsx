'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { DalDersFormSchema, DalDersFormValues, SinifSeviyesi } from '@/types/dalDersleri';

interface DalDersFormModalProps {
  initialData?: DalDersFormValues;
  sinifSeviyesi: SinifSeviyesi; // Pass the selected grade level
  onSubmit: (data: DalDersFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

export function DalDersFormModal({
  initialData,
  sinifSeviyesi,
  onSubmit,
  onClose,
  loading = false
}: DalDersFormModalProps) {

  const isEditing = !!initialData; // Check if initialData exists
  const modalTitle = isEditing
    ? `${sinifSeviyesi}. Sınıf Dersi Düzenle`
    : `${sinifSeviyesi}. Sınıfa Yeni Ders Ekle`;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DalDersFormValues>({
    resolver: zodResolver(DalDersFormSchema),
    defaultValues: initialData ?? {
      sinifSeviyesi: sinifSeviyesi, // Set default grade level
      dersAdi: '',
      haftalikSaat: 0,
    },
  });

  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={modalTitle}>
      {/* Add sinifSeviyesi as a hidden input if needed, or pass directly in submit handler */}
      {/* Pass sinifSeviyesi with the payload in the page component's submit handler instead of hidden input */}
      <form onSubmit={handleSubmit((data) => onSubmit({ ...data, sinifSeviyesi }))} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Ders Adı */}
          <div>
            <label htmlFor="dersAdi" className="block text-sm font-medium text-gray-700">Ders Adı</label>
            <input
              id="dersAdi"
              autoFocus
              type="text"
              placeholder="Örn: Web Tasarım ve Programlama"
              {...register('dersAdi')}
              aria-invalid={errors.dersAdi ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.dersAdi ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.dersAdi && <p className="text-red-600 text-sm">{errors.dersAdi.message}</p>}
          </div>

          {/* Haftalık Saat */}
          <div>
            <label htmlFor="haftalikSaat" className="block text-sm font-medium text-gray-700">Haftalık Saat</label>
            <input
              id="haftalikSaat"
              type="number"
              placeholder="Örn: 4"
              {...register('haftalikSaat', { valueAsNumber: true })} // Ensure value is number
              aria-invalid={errors.haftalikSaat ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.haftalikSaat ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.haftalikSaat && <p className="text-red-600 text-sm">{errors.haftalikSaat.message}</p>}
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