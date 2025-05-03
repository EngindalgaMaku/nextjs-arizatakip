'use client';

import React from 'react';
import { LabType } from '@/types/labTypes';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

interface LabTypesTableProps {
  labTypes: LabType[];
  onEdit: (labType: LabType) => void;
  onDelete: (id: string) => void;
}

export function LabTypesTable({ labTypes, onEdit, onDelete }: LabTypesTableProps) {
  if (!labTypes || labTypes.length === 0) {
    return <p className="text-center text-gray-500 italic my-4">Henüz laboratuvar tipi eklenmemiş.</p>;
  }

  return (
    <div className="overflow-x-auto shadow border-b border-gray-200 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {labTypes.map((labType) => (
            <tr key={labType.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{labType.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{labType.code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{labType.description || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                <button onClick={() => onEdit(labType)} className="text-indigo-600 hover:text-indigo-900" title="Düzenle">
                   <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDelete(labType.id)} className="text-red-600 hover:text-red-900" title="Sil">
                   <TrashIcon className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 