'use client';

import { PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { deleteTest, getTests } from '@/actions/testActions';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Test } from '@/types/tests';

// Function to format date
const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function AdminTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Store ID of test being deleted

  useEffect(() => {
    async function fetchTests() {
      setIsLoading(true);
      setError(null);
      try {
        const testsArray = await getTests(); // getTests her zaman Test[] döndürür
        setTests(testsArray);
        // testsArray boşsa, UI zaten "Gösterilecek test bulunamadı" mesajını gösterecektir.
      } catch (err) {
        console.error('Fetch tests error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
        setError(errorMessage);
        toast.error(`Testler yüklenemedi: ${errorMessage}`);
        setTests([]); // Hata durumunda test listesini boşalt
      } finally {
        setIsLoading(false);
      }
    }

    fetchTests();
  }, [router]); // router bağımlılığı, rota değişimlerinde yeniden fetch için olabilir, şimdilik koruyalım.

  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (window.confirm(`"${testTitle}" başlıklı testi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      setIsDeleting(testId);
      try {
        const result = await deleteTest(testId);
        if (result.success) {
          toast.success(`Test "${testTitle}" başarıyla silindi.`);
          setTests((prevTests) => prevTests.filter((test) => test.id !== testId));
        } else {
          toast.error(result.error || 'Test silinirken bir hata oluştu.');
        }
      } catch (err) {
        console.error('Delete test error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
        toast.error(`Test silinemedi: ${errorMessage}`);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Testler yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-red-500">Hata: {error}</p>
        <Button onClick={() => window.location.reload()}>Sayfayı Yenile</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Test Yönetimi</h1>
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline">
            <Link href="/dashboard/live-exams">
              Canlı Sınavlar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/tests/new">
              <PlusCircle className="mr-2 h-5 w-5" /> Yeni Test Oluştur
            </Link>
          </Button>
        </div>
      </div>

      {tests.length === 0 ? (
        <p>Gösterilecek test bulunamadı. Yeni bir test oluşturabilirsiniz.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>Oluşturulma Tarihi</TableHead>
              <TableHead>Soru Sayısı</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell className="font-medium">{test.title}</TableCell>
                <TableCell className="max-w-sm truncate" title={test.description || undefined}>
                  {test.description || '-'}
                </TableCell>
                <TableCell>{test.createdAt ? formatDate(test.createdAt) : 'Tarih Yok'}</TableCell>
                <TableCell>{test.questions?.length || 0}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/tests/${test.slug}`}>Görüntüle</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/tests/${test.slug}/edit`}>Düzenle</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTest(test.id, test.title)}
                      disabled={isDeleting === test.id}
                    >
                      {isDeleting === test.id ? (
                        'Siliniyor...'
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 