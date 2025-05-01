'use client';
import React from 'react';
import { Student } from '@/types/students';
import { PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export interface StudentsTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onShowGuardians: (student: Student) => void;
}

export function StudentsTable({ students, onEdit, onDelete, onShowGuardians }: StudentsTableProps) {
  // Add a mapping for gender display values
  const genderMap: { [key: string]: string } = {
    male: 'Erkek',
    female: 'Kadın',
    other: 'Diğer',
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border p-2 text-left">Ad Soyad</th>
            <th className="border p-2 text-left">Cinsiyet</th>
            <th className="border p-2 text-left">Okul No</th>
            <th className="border p-2 text-left">E-posta</th>
            <th className="border p-2 text-left">Doğum Tarihi</th>
            <th className="border p-2 text-left">Cep Telefonu</th>
            <th className="border p-2 text-left">Durum</th>
            <th className="border p-2 text-center">Veliler</th>
            <th className="border p-2 text-center">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="border p-2">{student.name}</td>
              <td className="border p-2"> 
                {student.gender ? genderMap[student.gender] ?? student.gender : '-'}
              </td>
              <td className="border p-2">{student.schoolNumber}</td>
              <td className="border p-2">{student.email || '-'}</td>
              <td className="border p-2">{student.birthDate || '-'}</td>
              <td className="border p-2">{student.phone || '-'}</td>
              <td className="border p-2">{student.status}</td>
              <td className="border p-2 text-center">
                {(student.guardians && student.guardians.length > 0) && (
                  <button 
                    onClick={() => onShowGuardians(student)} 
                    className="text-gray-600 hover:text-blue-600 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Veli Bilgilerini Göster"
                  >
                    <UserGroupIcon className="h-5 w-5" />
                  </button>
                )}
              </td>
              <td className="border p-2">
                <div className="flex items-center justify-center space-x-2">
                  <button 
                    onClick={() => onEdit(student)} 
                    className="text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Düzenle"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => onDelete(student.id!)} 
                    className="text-red-600 hover:text-red-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Sil"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center p-4 border text-gray-500">
                 Bu sınıfta kayıtlı öğrenci bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 