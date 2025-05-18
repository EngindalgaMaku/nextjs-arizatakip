import { getPublicTests } from '@/actions/testActions'; // Adjusted import path
import { TestCard } from '@/components/TestCard';

const pageContainerStyle = {
  maxWidth: '900px',
  margin: '20px auto',
  padding: '20px',
  fontFamily: 'Arial, sans-serif',
};

const pageTitleStyle = {
  textAlign: 'center' as const,
  marginBottom: '40px',
  fontSize: '2rem',
  fontWeight: 'bold',
  color: '#333',
};

const testGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', // Responsive grid
  gap: '25px',
};

export default async function PublicTestsPage() {
  const tests = await getPublicTests();

  return (
    <div style={pageContainerStyle}>
      <h1 style={pageTitleStyle}>TEST VE ÇALIŞMA PLATFORMU</h1>
      {(!tests || tests.length === 0) ? (
        <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem' }}>
          <p>Herkese açık test bulunmamaktadır.</p>
        </div>
      ) : (
        <div style={testGridStyle}>
          {tests.map(test => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      )}
    </div>
  );
} 