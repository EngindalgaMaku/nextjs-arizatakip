'use client'; // Form etkileşimi ve @tanstack/react-query için

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBranches, deleteBranch } from '@/actions/branchActions';
import { Branch } from '@/types/branches';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export default function BranchesPage() {
  const queryClient = useQueryClient();

  const { data: branches, isLoading, error } = useQuery<Branch[], Error>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteBranch,
    onSuccess: () => {
      toast.success('Branş başarıyla silindi.');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (error) => {
      toast.error(`Branş silinirken hata: ${error.message}`);
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Bu branşı silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <DashboardLayout><div className="p-4">Yükleniyor...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-4 text-red-500">Hata: {error.message}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Branş Yönetimi</h1>
          <Link href="/dashboard/branches/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Branş Ekle
            </Button>
          </Link>
        </div>

        {branches && branches.length > 0 ? (
          <div className="rounded-md border bg-background shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branş Adı</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>{branch.code || '-'}</TableCell>
                    <TableCell>{branch.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/dallar?branchId=${branch.id}`} passHref>
                        <Button variant="outline" size="sm" className="mr-2">
                          <BookOpen className="mr-1 h-3 w-3" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/branches/edit/${branch.id}`} passHref>
                        <Button variant="outline" size="sm" className="mr-2">
                          <Edit className="mr-1 h-3 w-3" /> Düzenle
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => branch.id && handleDelete(branch.id)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === branch.id}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Sil
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Henüz hiç branş eklenmemiş.</p>
            <Link href="/dashboard/branches/new" passHref>
              <Button className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> İlk Branşı Ekle
              </Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 