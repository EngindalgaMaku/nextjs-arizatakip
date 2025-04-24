'use client';

import { useState } from 'react';
import { updateIssue, DeviceType, DeviceLocation, IssueStatus, IssuePriority, Issue } from '@/lib/supabase';

interface EditIssueFormProps {
  issue: Issue & {
    created_at: string; // ISO string veya TR tarih formatı
    updated_at: string | null; // ISO string, TR tarih formatı veya null
    resolved_at: string | null; // ISO string, TR tarih formatı veya null
  };
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormData {
  device_type: DeviceType;
  device_name: string;
  device_location: DeviceLocation;
  room_number: string;
  reported_by: string;
  assigned_to: string | null;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  notes: string | null;
  resolved_at?: string | null;
}

export default function EditIssueForm({ issue, onCancel, onSuccess }: EditIssueFormProps) {
  const [formData, setFormData] = useState<FormData>({
    device_type: issue.device_type,
    device_name: issue.device_name,
    device_location: issue.device_location,
    room_number: issue.room_number,
    reported_by: issue.reported_by,
    assigned_to: issue.assigned_to || '',
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    notes: issue.notes || '',
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Temizle hataları
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.device_name.trim()) {
      errors.device_name = 'Cihaz adı gereklidir';
    }
    
    if (!formData.room_number.trim()) {
      errors.room_number = 'Oda numarası gereklidir';
    }
    
    if (!formData.reported_by.trim()) {
      errors.reported_by = 'Bildiren kişi bilgisi gereklidir';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Arıza açıklaması gereklidir';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError('');
    
    // Validate form
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Eğer durum "çözüldü" olarak değiştiyse resolved_at değerini ekle
      const dataToSubmit = {
        ...formData,
        resolved_at: formData.status === 'cozuldu' && !issue.resolved_at ? new Date().toISOString() : issue.resolved_at
      };
      
      await updateIssue(issue.id, dataToSubmit);
      onSuccess();
    } catch (error) {
      console.error('Error updating issue:', error);
      setError('Kayıt güncellenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="device_type" className="block text-sm font-medium text-gray-700">
              Cihaz Tipi
            </label>
            <select
              id="device_type"
              name="device_type"
              className="mt-1 block w-full rounded-md bg-white border-gray-400 text-gray-800 shadow-sm focus:border-blue-600 focus:ring-blue-500 sm:text-sm"
              value={formData.device_type}
              onChange={handleInputChange}
            >
              <option value="akilli_tahta">Akıllı Tahta</option>
              <option value="bilgisayar">Bilgisayar</option>
              <option value="yazici">Yazıcı</option>
              <option value="projektor">Projektör</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="device_name" className="block text-sm font-medium text-gray-700">
              Cihaz Adı
            </label>
            <input
              type="text"
              name="device_name"
              id="device_name"
              placeholder="Örn: Samsung Akıllı Tahta S40"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white text-gray-800 ${
                formErrors.device_name
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                  : 'border-gray-400 focus:border-blue-600 focus:ring-blue-500'
              }`}
              value={formData.device_name}
              onChange={handleInputChange}
            />
            {formErrors.device_name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.device_name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="device_location" className="block text-sm font-medium text-gray-700">
              Konum
            </label>
            <select
              id="device_location"
              name="device_location"
              className="mt-1 block w-full rounded-md bg-white border-gray-400 text-gray-800 shadow-sm focus:border-blue-600 focus:ring-blue-500 sm:text-sm"
              value={formData.device_location}
              onChange={handleInputChange}
            >
              <option value="sinif">Sınıf</option>
              <option value="laboratuvar">Laboratuvar</option>
              <option value="idare">İdare</option>
              <option value="ogretmenler_odasi">Öğretmenler Odası</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="room_number" className="block text-sm font-medium text-gray-700">
              Oda/Sınıf Numarası
            </label>
            <input
              type="text"
              name="room_number"
              id="room_number"
              placeholder="Örn: 101 veya Lab-02"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white text-gray-800 ${
                formErrors.room_number
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                  : 'border-gray-400 focus:border-blue-600 focus:ring-blue-500'
              }`}
              value={formData.room_number}
              onChange={handleInputChange}
            />
            {formErrors.room_number && (
              <p className="mt-1 text-sm text-red-600">{formErrors.room_number}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reported_by" className="block text-sm font-medium text-gray-700">
              Bildiren Kişi
            </label>
            <input
              type="text"
              name="reported_by"
              id="reported_by"
              placeholder="Örn: Ahmet Öğretmen"
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white text-gray-800 ${
                formErrors.reported_by
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                  : 'border-gray-400 focus:border-blue-600 focus:ring-blue-500'
              }`}
              value={formData.reported_by}
              onChange={handleInputChange}
            />
            {formErrors.reported_by && (
              <p className="mt-1 text-sm text-red-600">{formErrors.reported_by}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">
              Atanan Kişi (Opsiyonel)
            </label>
            <input
              type="text"
              name="assigned_to"
              id="assigned_to"
              placeholder="Örn: Mehmet Teknisyen"
              className="mt-1 block w-full rounded-md bg-white border-gray-400 text-gray-800 shadow-sm focus:border-blue-600 focus:ring-blue-500 sm:text-sm"
              value={formData.assigned_to || ''}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Arıza Açıklaması
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Arızanın detaylı açıklaması..."
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white text-gray-800 ${
              formErrors.description
                ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                : 'border-gray-400 focus:border-blue-600 focus:ring-blue-500'
            }`}
            value={formData.description}
            onChange={handleInputChange}
          ></textarea>
          {formErrors.description && (
            <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Durum
            </label>
            <select
              id="status"
              name="status"
              className="mt-1 block w-full rounded-md bg-white border-gray-400 text-gray-800 shadow-sm focus:border-blue-600 focus:ring-blue-500 sm:text-sm"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="beklemede">Beklemede</option>
              <option value="atandi">Atandı</option>
              <option value="inceleniyor">İnceleniyor</option>
              <option value="cozuldu">Çözüldü</option>
              <option value="kapatildi">Kapatıldı</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Öncelik
            </label>
            <select
              id="priority"
              name="priority"
              className="mt-1 block w-full rounded-md bg-white border-gray-400 text-gray-800 shadow-sm focus:border-blue-600 focus:ring-blue-500 sm:text-sm"
              value={formData.priority}
              onChange={handleInputChange}
            >
              <option value="dusuk">Düşük</option>
              <option value="normal">Normal</option>
              <option value="yuksek">Yüksek</option>
              <option value="kritik">Kritik</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notlar (Opsiyonel)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Ek notlar..."
            className="mt-1 block w-full rounded-md bg-white border-gray-400 text-gray-800 shadow-sm focus:border-blue-600 focus:ring-blue-500 sm:text-sm"
            value={formData.notes || ''}
            onChange={handleInputChange}
          ></textarea>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
} 