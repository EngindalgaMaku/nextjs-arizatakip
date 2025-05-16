'use client';

import { deleteTest, getTests } from '@/actions/testActions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Test } from '@/types/tests';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-hot-toast';

interface TestsPageProps {
  // Eğer Server Component olsaydı:
  // tests: Test[]; // Bu prop olarak gelecekti
}

export default function TestsPage({}: TestsPageProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [isDeleting, startTransition] = useTransition();
  const router = useRouter();

  // Verileri client tarafında çekmek için
  // Bu kısım Next.js App Router'da Server Component kullanılıyorsa gereksizdir.
  // Ama 'use client' tepede olduğu için bu şekilde devam ediyoruz.
  useEffect(() => {
    async function fetchTests() {
      setIsLoadingTests(true);
      try {
        const fetchedTests = await getTests(); // action'dan çağır
        setTests(fetchedTests);
      } catch (error) {
        console.error("Failed to fetch tests:", error);
        toast.error('Testler yüklenirken bir hata oluştu.');
        setTests([]); // Hata durumunda boş dizi
      } finally {
        setIsLoadingTests(false);
      }
    }
    fetchTests();
  }, []); // Dependency array düzeltildi

  const handleDeleteClick = (test: Test) => {
    setTestToDelete(test);
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!testToDelete) return;

    startTransition(async () => {
      const result = await deleteTest(testToDelete.id);
      if (result.success) {
        toast.success(`Test "${testToDelete.title}" başarıyla silindi.`);
        // Test listesini yeniden yükle
        // Sayfayı yenilemek yerine state'i güncellemek daha iyi olur
        setTests(prevTests => prevTests.filter(t => t.id !== testToDelete.id));
        router.refresh(); // Server component'leri ve datayı yeniden doğrulamak için
      } else {
        toast.error(result.error || 'Test silinirken bir hata oluştu.');
      }
      setShowConfirmModal(false);
      setTestToDelete(null);
    });
  };

  if (isLoadingTests) {
    return <div className="p-4">Testler yükleniyor...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Test Yönetimi</h1>
        <Button asChild>
          <Link href="/dashboard/tests/new">Yeni Test Ekle</Link>
        </Button>
      </div>

      {tests.length === 0 ? (
        <p className="text-center text-gray-500">Henüz test bulunmuyor.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Soru Sayısı</TableHead>
              <TableHead>Süre (dk)</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Eylemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell className="font-medium">{test.title}</TableCell>
                <TableCell>{test.slug}</TableCell>
                <TableCell>{test.questions.length}</TableCell>
                <TableCell>{test.timeLimit || '-'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    test.isPublished 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {test.isPublished ? 'Yayında' : 'Taslak'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/tests/${test.slug}`}>Görüntüle</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/tests/${test.slug}/edit`}>Düzenle</Link>
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteClick(test)}
                      disabled={isDeleting}
                    >
                      {isDeleting && testToDelete?.id === test.id ? 'Siliniyor...' : 'Sil'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {showConfirmModal && testToDelete && (
        <AlertDialog 
          title="Testi Silmeyi Onayla"
          isOpen={showConfirmModal}
          onConfirm={handleDeleteConfirm}
          onOpenChange={setShowConfirmModal}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Testi Silmeyi Onayla</AlertDialogTitle>
              <AlertDialogDescription>
                "{testToDelete.title}" başlıklı testi kalıcı olarak silmek istediğinizden emin misiniz? 
                Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 