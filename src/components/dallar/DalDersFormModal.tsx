'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod'; // Import Zod
import Modal from '@/components/Modal';
import { DalDersFormSchema, DalDersFormValues } from '@/types/dalDersleri';
import { LabType } from '@/types/labTypes'; // Import LabType
import { SinifSeviyesi } from '@/types/dalDersleri'; // Import SinifSeviyesi

interface DalDersFormModalProps {
  initialData?: DalDersFormValues & { suitableLabTypeIds?: string[] };
  sinifSeviyesi: SinifSeviyesi;
  availableLabTypes: LabType[]; // Add prop for available lab types
  initialLabTypeIds?: string[]; // Add prop for pre-selected IDs when editing
  onSubmit: (data: DalDersFormValues & { suitableLabTypeIds?: string[] }) => void; // Update submit data type
  onClose: () => void;
  loading?: boolean;
}

export function DalDersFormModal({
  initialData,
  sinifSeviyesi,
  availableLabTypes = [], // Default to empty array
  initialLabTypeIds = [], // Default to empty array
  onSubmit,
  onClose,
  loading = false
}: DalDersFormModalProps) {

  // Log initial data received by the modal
  console.log('[DalDersFormModal] Received initialData:', initialData);
  console.log('[DalDersFormModal] Received initialLabTypeIds prop:', initialLabTypeIds); // Log the prop

  const isEditing = !!initialData?.dersAdi; // Check if dersAdi exists in initialData for editing status
  const modalTitle = isEditing
    ? `${sinifSeviyesi}. Sınıf Dersi Düzenle`
    : `${sinifSeviyesi}. Sınıfa Yeni Ders Ekle`;

  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset } = useForm<DalDersFormValues & { suitableLabTypeIds?: string[] }>({
    // Extend the schema directly for form usage
    resolver: zodResolver(DalDersFormSchema.extend({
        suitableLabTypeIds: z.array(z.string().uuid()).optional(),
    })),
    defaultValues: {
      sinifSeviyesi: initialData?.sinifSeviyesi ?? sinifSeviyesi,
      dersAdi: initialData?.dersAdi ?? '',
      haftalikSaat: initialData?.haftalikSaat ?? 0,
      bolunebilir_mi: initialData?.bolunebilir_mi ?? true,
      cizelgeye_dahil_et: initialData?.cizelgeye_dahil_et ?? true, 
      requires_multiple_resources: initialData?.requires_multiple_resources ?? false, 
      suitableLabTypeIds: initialLabTypeIds,
    },
  });

  // Log the actual default values being set initially
  // console.log('[DalDersFormModal] Initial defaultValues:', { ... }); // Logging defaultValues might be less useful now

  // --- NEW useEffect to reset form when initialLabTypeIds changes ---
  useEffect(() => {
      console.log('[DalDersFormModal] useEffect triggered. initialLabTypeIds:', initialLabTypeIds);
      // Reset the specific field or the relevant part of the form
      // when the prop holding the fetched IDs changes.
      reset({ 
         // Important: Re-spread other initial data to avoid losing it on reset
         sinifSeviyesi: initialData?.sinifSeviyesi ?? sinifSeviyesi,
         dersAdi: initialData?.dersAdi ?? '',
         haftalikSaat: initialData?.haftalikSaat ?? 0,
         bolunebilir_mi: initialData?.bolunebilir_mi ?? true,
         cizelgeye_dahil_et: initialData?.cizelgeye_dahil_et ?? true, 
         requires_multiple_resources: initialData?.requires_multiple_resources ?? false, 
         // Set the lab types based on the potentially updated prop
         suitableLabTypeIds: initialLabTypeIds 
      });
  }, [initialLabTypeIds, reset, initialData, sinifSeviyesi]); // Add dependencies: initialLabTypeIds is key, reset is needed, others ensure full reset data
  // --- End of new useEffect ---

  const isBusy = loading || isSubmitting;
  console.log('[DalDersFormModal] State:', { isBusy, loading, isSubmitting }); // Add log

  return (
    <Modal isOpen onClose={onClose} title={modalTitle}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    {...register('haftalikSaat', { valueAsNumber: true })}
                    aria-invalid={errors.haftalikSaat ? 'true' : 'false'}
                    className={`mt-1 block w-full rounded p-2 border ${errors.haftalikSaat ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.haftalikSaat && <p className="text-red-600 text-sm">{errors.haftalikSaat.message}</p>}
                </div>

                {/* Bölünebilirlik Checkbox */} 
                <div className="flex items-center">
                  <input
                    id="bolunebilir_mi"
                    type="checkbox"
                    {...register('bolunebilir_mi')}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="bolunebilir_mi" className="ml-2 block text-sm text-gray-900">
                    Ders Bölünebilir Mi? (Haftalık saati 2'den fazla ise farklı gün/saatlere atanabilir)
                  </label>
                </div>
                {errors.bolunebilir_mi && <p className="text-red-600 text-sm">{errors.bolunebilir_mi.message}</p>}

                {/* Çizelgeye Dahil Et Checkbox */}
                <div className="flex items-center">
                  <input
                    id="cizelgeye_dahil_et"
                    type="checkbox"
                    {...register('cizelgeye_dahil_et')}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="cizelgeye_dahil_et" className="ml-2 block text-sm text-gray-900">
                    Dersi Otomatik Çizelgelemeye Dahil Et
                  </label>
                </div>
                {errors.cizelgeye_dahil_et && <p className="text-red-600 text-sm">{errors.cizelgeye_dahil_et.message}</p>}

                {/* Birden Fazla Kaynak Gerekir Checkbox */}
                <div className="flex items-center">
                  <input
                    id="requires_multiple_resources"
                    type="checkbox"
                    {...register('requires_multiple_resources')}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="requires_multiple_resources" className="ml-2 block text-sm text-gray-900">
                    Aynı Anda Birden Fazla Kaynak Gerektirir (Örn: 2 Lab, Öğretmen+Lab)
                  </label>
                </div>
                {errors.requires_multiple_resources && <p className="text-red-600 text-sm">{errors.requires_multiple_resources.message}</p>}

                 {/* Suitable Lab Types (Multi-select) */}
                 <div>
                    <label htmlFor="suitableLabTypeIds" className="block text-sm font-medium text-gray-700">Uygun Laboratuvar Tipleri</label>
                    <Controller
                        name="suitableLabTypeIds"
                        control={control}
                        render={({ field }) => {
                            // Add a log to see the field value react-hook-form is using
                            console.log('[DalDersFormModal] Controller field.value for suitableLabTypeIds:', field.value); 
                            return (
                                <select
                                    id="suitableLabTypeIds"
                                    multiple // Enable multiple selections
                                    {...field}
                                    // Handle multiple select value and onChange
                                    // Ensure field.value is always an array for multi-select
                                    value={Array.isArray(field.value) ? field.value : []} 
                                    onChange={(e) => {
                                        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                        field.onChange(selectedOptions);
                                    }}
                                    className={`mt-1 block w-full rounded p-2 border h-32 ${errors.suitableLabTypeIds ? 'border-red-500' : 'border-gray-300'}`}
                                >
                                    {availableLabTypes.length === 0 && <option disabled>Uygun lab tipi bulunamadı.</option>}
                                    {availableLabTypes.map((labType) => (
                                        <option key={labType.id} value={labType.id}>
                                            {labType.name} ({labType.code})
                                        </option>
                                    ))}
                                </select>
                            );
                        }}
                    />
                     <p className="mt-1 text-xs text-gray-500">Birden fazla seçmek için CTRL (veya Mac'te Command) tuşunu basılı tutarak tıklayın.</p>
                    {errors.suitableLabTypeIds && <p className="text-red-600 text-sm">{errors.suitableLabTypeIds.message}</p>}
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