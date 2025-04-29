'use client';

import React from 'react';
import { Location } from '@/types/locations';
import { PencilIcon, TrashIcon, QrCodeIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { formatDate } from '@/lib/helpers'; // Assuming you have a date formatter

// Departman değerlerini etiketlerine dönüştüren yardımcı fonksiyon
const getDepartmentLabel = (departmentValue: string | null): string => {
  const departmentMap: Record<string, string> = {
    'bilisim': 'Bilişim Teknolojileri',
    'elektronik': 'Elektrik-Elektronik',
    'makine': 'Makine',
    'tekstil': 'Tekstil',
    'muhasebe': 'Muhasebe',
    'ortak_alan': 'Ortak Kullanım',
    'diger': 'Diğer'
  };
  
  return departmentValue ? departmentMap[departmentValue] || departmentValue : '-';
};

interface LocationsTableProps {
  locations: Location[];
  onEdit: (location: Location) => void;
  onDelete: (locationId: string) => void;
  onViewQrCode: (location: Location) => void;
  onViewProperties: (location: Location) => void;
  onMove: (locationId: string, direction: 'up' | 'down') => void;
  isLoading?: boolean; // Optional loading state for delete/actions
}

export default function LocationsTable({
  locations,
  onEdit,
  onDelete,
  onViewQrCode,
  onViewProperties,
  onMove,
  isLoading = false,
}: LocationsTableProps) {
  if (!locations || locations.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Henüz konum eklenmemiş.</p>
        {/* Optionally add a button here to trigger the create modal */}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
              Adı
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Departman
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Tipi
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Özellikler
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Eylemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {locations.map((location, index) => (
            <tr key={location.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                <div className="inline-flex flex-col mr-2 align-middle">
                   <button
                      type="button"
                      onClick={() => onMove(location.id, 'up')}
                      disabled={index === 0 || isLoading || location.sort_order === null}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Yukarı Taşı"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(location.id, 'down')}
                      disabled={index === locations.length - 1 || isLoading || location.sort_order === null}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Aşağı Taşı"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                </div>
                {location.name}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {getDepartmentLabel(location.department)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {location.type || '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <button
                  onClick={() => onViewProperties(location)}
                  disabled={isLoading || !location.properties || Object.keys(location.properties).length === 0}
                  title="Özellikleri Görüntüle"
                  className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                <button
                  onClick={() => onViewQrCode(location)}
                  disabled={isLoading || !location.barcode_value}
                  title="Barkodu Görüntüle"
                  className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <QrCodeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => onEdit(location)}
                  disabled={isLoading}
                  title="Düzenle"
                  className="text-blue-600 hover:text-blue-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <PencilIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => onDelete(location.id)}
                  disabled={isLoading}
                  title="Sil"
                  className="text-red-600 hover:text-red-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 