'use client';

import React from 'react';
import { Teacher, teacherRoleLabels } from '@/types/teachers'; // Import Teacher type and role labels
import { PencilSquareIcon, TrashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface AreaTeachersTableProps {
  teachers: Teacher[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacherId: string) => void;
}

export function AreaTeachersTable({ teachers, onEdit, onDelete }: AreaTeachersTableProps) {
  if (!teachers.length) {
    return <p className="text-center text-gray-500 py-8">Henüz alan öğretmeni eklenmemiş.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doğum Tarihi</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cep Telefonu</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görevi</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Eylemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {teachers.map((teacher) => (
            <tr key={teacher.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.birthDate || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phone || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.role ? teacherRoleLabels[teacher.role] : '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <Link href={`/dashboard/area-teachers/${teacher.id}/schedule`} className="text-green-600 hover:text-green-900 inline-block" title="Ders Programı">
                   <CalendarDaysIcon className="h-5 w-5" />
                </Link>
                <button onClick={() => onEdit(teacher)} className="text-indigo-600 hover:text-indigo-900" title="Düzenle">
                   <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDelete(teacher.id)} className="text-red-600 hover:text-red-900" title="Sil">
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