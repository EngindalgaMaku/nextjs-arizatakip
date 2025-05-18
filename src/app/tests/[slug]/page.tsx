import { getPublicTestBySlug } from '@/actions/testActions'; // Adjusted import path
import { Test, TestQuestion } from '@/types/tests'; // Adjusted import path. Assuming Test type is also needed here.
import Link from 'next/link';

interface TestViewPageProps {
  params: {
    slug: string;
  };
}

// Basit Question component\'i
function QuestionDisplay({ question, index }: { question: TestQuestion; index: number }) {
  return (
    <div style={{ border: '1px solid #eee', padding: '12px', marginBottom: '12px', borderRadius: '4px' }}>
      <h4>Soru {index + 1}: {question.text}</h4>
      {question.options && question.options.length > 0 && (
        <ul style={{ listStyleType: 'alpha', paddingLeft: '20px' }}>
          {question.options.map(option => (
            <li key={option.id}>{option.text}</li>
          ))}
        </ul>
      )}
      {/* Public view\'da doğru cevap veya puan gösterilmemeli */}
    </div>
  );
}

export default async function PublicTestViewPage({ params }: TestViewPageProps) {
  const { slug } = params;
  const test: Test | null = await getPublicTestBySlug(slug); // Explicitly type `test`

  if (!test) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>Test Bulunamadı</h1>
        <p>Aradığınız test bulunamadı veya herkese açık değil.</p>
        <Link href="/tests"><button style={{ marginTop: '20px' }}>Tüm Testlere Geri Dön</button></Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Link href="/tests"><button style={{ marginBottom: '20px' }}>&larr; Tüm Testler</button></Link>
      <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>{test.title}</h1>
      <p style={{ marginTop: '10px', marginBottom: '20px' }}>{test.description || 'Açıklama bulunmuyor.'}</p>
      
      <h2>Sorular</h2>
      {test.questions && test.questions.length > 0 ? (
        test.questions.map((question, index) => (
          <QuestionDisplay key={question.id || index} question={question} index={index} />
        ))
      ) : (
        <p>Bu test için soru bulunmamaktadır.</p>
      )}
    </div>
  );
} 