import { getPublicTests } from '@/actions/testActions'; // Adjusted import path
import { Test } from '@/types/tests'; // Adjusted import path
import Link from 'next/link';

// Basit bir Card component\'i (projenizde varsa Shadcn/ui veya Tamagui component\'lerini kullanabilirsiniz)
function TestCard({ test }: { test: Test }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
      <h2>{test.title}</h2>
      <p>{test.description || 'Açıklama bulunmuyor.'}</p>
      <Link href={`/tests/${test.slug}`}> {/* Bu yol hala /tests/... şeklinde kalacak, çünkü Next.js app router'ı dosya sistemine göre path oluşturur admin/src/app altından itibaren */} 
        <button style={{ marginTop: '8px', padding: '8px 12px', cursor: 'pointer' }}>
          Teste Git
        </button>
      </Link>
    </div>
  );
}

export default async function PublicTestsPage() {
  const tests = await getPublicTests();

  if (!tests || tests.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <p>Herkese açık test bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Herkese Açık Testler</h1>
      <div>
        {tests.map(test => (
          <TestCard key={test.id} test={test} />
        ))}
      </div>
    </div>
  );
} 