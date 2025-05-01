'use client';

import React from 'react';
import { Class } from '@/types/classes'; // Import Class type
import { Teacher } from '@/types/teachers'; // Import Teacher type
import { PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline'; // Added UsersIcon
import Link from 'next/link';

export interface ClassesTableProps {
  classes: (Class & { teacher?: Teacher | null })[]; // Allow optional teacher object if joined
  teachersMap: Map<string, string>; // Map teacherId to teacherName for display
  onEdit: (classData: Class) => void;
  onDelete: (id: string) => void;
}

export function ClassesTable({ classes, teachersMap, onEdit, onDelete }: ClassesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border p-2 text-left">Sınıf Adı</th>
            <th className="border p-2 text-left">Alan/Dal</th>
            <th className="border p-2 text-left">Sınıf Öğretmeni</th>
            <th className="border p-2 text-left">Sınıf Başkanı</th>
            <th className="border p-2 text-center">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {classes.map(cls => (
            <tr key={cls.id} className="hover:bg-gray-50">
              <td className="border p-2">{cls.name}</td>
              <td className="border p-2">{cls.department || '-'}</td>
              <td className="border p-2">
                {cls.classTeacherId ? teachersMap.get(cls.classTeacherId) ?? 'Bilinmiyor' : '-'}
              </td>
              <td className="border p-2">{cls.classPresidentName || '-'}</td>
              <td className="border p-2">
                <div className="flex items-center justify-center space-x-2">
                  {/* View Students Button */}
                   <Link
                      href={`/dashboard/classes/${cls.id}/students`}
                      className="text-green-600 hover:text-green-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                      title="Öğrencileri Görüntüle"
                   >
                     <UsersIcon className="h-5 w-5" />
                  </Link>
                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(cls)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Sınıfı Düzenle"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                   {/* Delete Button */}
                  <button
                    onClick={() => onDelete(cls.id!)}
                    className="text-red-600 hover:text-red-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Sınıfı Sil"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {classes.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center p-4 border text-gray-500">
                 Kayıtlı sınıf bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 