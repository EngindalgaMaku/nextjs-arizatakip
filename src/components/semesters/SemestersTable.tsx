'use client';

import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Semester } from '@/types/semesters';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircleIcon, XCircleIcon, PencilIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';

interface SemestersTableProps {
  semesters: Semester[];
  onEdit: (semester: Semester) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  isLoading?: boolean;
}

export function SemestersTable({
  semesters,
  onEdit,
  onDelete,
  onSetActive,
  isLoading = false,
}: SemestersTableProps) {
  return (
    <div className="rounded-md border bg-background shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Aktif</TableHead>
            <TableHead>Sömestr Adı</TableHead>
            <TableHead>Başlangıç Tarihi</TableHead>
            <TableHead>Bitiş Tarihi</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {semesters.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Henüz sömestr bulunamadı.
              </TableCell>
            </TableRow>
          ) : (
            semesters.map((semester) => (
              <TableRow key={semester.id}>
                <TableCell className="text-center">
                  {semester.is_active ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mx-auto" title="Aktif Sömestr" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetActive(semester.id)}
                      disabled={isLoading}
                      title="Bu sömestri aktif yap"
                      className="mx-auto flex items-center justify-center"
                    >
                      <StarIcon className="h-5 w-5 text-gray-400 hover:text-yellow-500" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="font-medium">{semester.name}</TableCell>
                <TableCell>{format(new Date(semester.start_date), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                <TableCell>{format(new Date(semester.end_date), 'dd MMMM yyyy', { locale: tr })}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(semester)}
                    disabled={isLoading}
                    aria-label={`Düzenle ${semester.name}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(semester.id)}
                    disabled={isLoading || semester.is_active} // Prevent deleting active semester
                    title={semester.is_active ? 'Aktif sömestr silinemez' : `Sil ${semester.name}`}
                    aria-label={`Sil ${semester.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 