'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Location, LocationFormData, LocationSchema, PropertyField } from '@/types/locations';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface LocationFormProps {
  onSubmit: (data: LocationFormData) => Promise<void>;
  onClose: () => void;
  initialData?: Location | null;
  isSubmitting: boolean;
}

// Basic list of types - consider fetching from DB or constants if more dynamic
const locationTypes = [
  { value: 'sinif', label: 'Sınıf' },
  { value: 'laboratuvar', label: 'Laboratuvar' },
  { value: 'idare', label: 'İdare' },
  { value: 'ogretmenler_odasi', label: 'Öğretmenler Odası' },
  { value: 'atolye', label: 'Atölye' },
  { value: 'diger', label: 'Diğer' },
];

// Departman listesi
const departments = [
  { value: 'bilisim', label: 'Bilişim Teknolojileri' },
  { value: 'muhasebe', label: 'Muhasebe' },
  { value: 'halkla_iliskiler', label: 'Halkla İlişkiler' },
  { value: 'gazetecilik', label: 'Gazetecilik' },
  { value: 'radyo_tv', label: 'Radyo ve Televizyon' },
  { value: 'plastik_sanatlar', label: 'Plastik Sanatlar' },
  { value: 'idare', label: 'İdare' },
  { value: 'diger', label: 'Diğer' },
];

export default function LocationForm({ 
  onSubmit, 
  onClose, 
  initialData,
  isSubmitting
}: LocationFormProps) {
  const initialPropertiesArray = initialData?.properties || [];

  const { 
    register, 
    control,
    handleSubmit, 
    formState: { errors },
    reset,
  } = useForm<LocationFormData>({
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || '',
      department: initialData?.department || '',
      description: initialData?.description || '',
      properties: initialPropertiesArray, 
    },
  });

  const { fields, append, remove, move } = useFieldArray<LocationFormData, "properties", "id">({
    control,
    name: "properties",
  });

  useEffect(() => {
     const resetData = {
        name: initialData?.name || '',
        type: initialData?.type || '',
        department: initialData?.department || '',
        description: initialData?.description || '',
        properties: initialData?.properties || [],
     };
    reset(resetData);
  }, [initialData, reset]);

  const handleFormSubmit = async (data: LocationFormData) => {
    const validation = LocationSchema.safeParse(data);

    if (!validation.success) {
        console.error("Zod Validation Error:", validation.error.errors);
        const propError = validation.error.errors.find(e => e.path.includes('properties'));
        const firstErrorMessage = validation.error.errors[0]?.message || 'Bilinmeyen doğrulama hatası.';
        const displayMessage = propError ? `Özellik Hatası (${propError.path.join('.')}): ${propError.message}` : `Doğrulama Hatası: ${firstErrorMessage}`;
        alert(displayMessage);
        return;
    }
    await onSubmit(validation.data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Konum Adı <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.name ? 'border-red-500' : ''}`}
          placeholder="Örn: Bilişim Lab-1, 10-A Sınıfı"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Konum Tipi
        </label>
        <select
          id="type"
          {...register('type')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.type ? 'border-red-500' : ''}`}
        >
          <option value="">-- Tip Seçin --</option>
          {locationTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
      </div>

      <div>
        <label htmlFor="department" className="block text-sm font-medium text-gray-700">
          Departman
        </label>
        <select
          id="department"
          {...register('department')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.department ? 'border-red-500' : ''}`}
        >
          <option value="">-- Departman Seçin --</option>
          {departments.map((dept) => (
            <option key={dept.value} value={dept.value}>
              {dept.label}
            </option>
          ))}
        </select>
        {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Açıklama
        </label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.description ? 'border-red-500' : ''}`}
          placeholder="Konum hakkında ek notlar (opsiyonel)"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      {/* Dynamic Properties Section */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
         <h3 className="text-sm font-medium text-gray-900">Ek Özellikler</h3>
         {fields.map((field, index) => (
           <div key={field.id} className="flex items-center space-x-1.5">
             {/* Up/Down Buttons */}
             <div className="flex flex-col">
                <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    className="p-0.5 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    title="Yukarı Taşı"
                >
                    <ArrowUpIcon className="h-4 w-4" />
                </button>
                 <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === fields.length - 1}
                    className="p-0.5 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    title="Aşağı Taşı"
                >
                    <ArrowDownIcon className="h-4 w-4" />
                </button>
             </div>
             {/* Key Input */}
             <div className="flex-1">
               <label htmlFor={`properties.${index}.key`} className="sr-only">Özellik Adı</label>
               <input
                 type="text"
                 {...register(`properties.${index}.key` as const)}
                 className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                 placeholder="Özellik Adı"
               />
                {/* Display key validation errors - ensure message is a string */}
                {errors.properties?.[index]?.key?.message && (
                   <p className="mt-1 text-xs text-red-600">
                     {typeof errors.properties[index]?.key?.message === 'string' ? errors.properties[index]?.key?.message : 'Geçersiz anahtar'}
                   </p>
                 )}
             </div>
             {/* Value Input */}
             <div className="flex-1">
                <label htmlFor={`properties.${index}.value`} className="sr-only">Değer</label>
                <input
                  type="text"
                  {...register(`properties.${index}.value` as const)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Değer"
                />
                {/* Display value validation errors - ensure message is a string */}
                 {errors.properties?.[index]?.value?.message && (
                   <p className="mt-1 text-xs text-red-600">
                      {typeof errors.properties[index]?.value?.message === 'string' ? errors.properties[index]?.value?.message : 'Geçersiz değer'}
                   </p>
                 )}
             </div>
             {/* Remove Button */}
             <button
                type="button"
                onClick={() => remove(index)}
                className="p-1 text-red-600 hover:text-red-800"
                title="Özelliği Kaldır"
             >
                <TrashIcon className="h-5 w-5" />
             </button>
           </div>
         ))}

         {/* Add Property Button */}
         <button
            type="button"
            onClick={() => append({ key: '', value: '' })}
            className="mt-2 inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
         >
            <PlusIcon className="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />
            Özellik Ekle
         </button>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {isSubmitting ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Oluştur')}
        </button>
      </div>
    </form>
  );
} 