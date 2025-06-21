'use client';

import { useEffect, useState } from 'react';
import { getStudentReceiptStatusByMonth, type StudentReceiptStatus } from '@/actions/business-receipts/admin-actions';

const monthNames = {
  1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
  7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
};

export default function PrintPage() {
  const [studentStatuses, setStudentStatuses] = useState<StudentReceiptStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const academicMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  const currentYear = 2024; // 2024-2025 akademik yılı için

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const result = await getStudentReceiptStatusByMonth({ year: currentYear });
        
        if (result.error) {
          setError(result.error);
          console.error('Dekont verisi hatası:', result.error);
        } else {
          console.log('Gelen dekont verileri:', result.data);
          
          // Sadece dekont sistemi kullanan sınıfları filtrele (9A, 11A ve 11H hariç)
          const filteredData = (result.data || []).filter(student => {
            const className = student.student_class_name;
            // 9A, 11A ve 11H sınıflarını hariç tut - onlar dekont göndermiyor
            return className !== '9A' && className !== '11A' && className !== '11H';
          }).map(student => {
            // 12 Mesem'i 9 Mesem olarak değiştir
            if (student.student_class_name === '12Mesem') {
              return {
                ...student,
                student_class_name: '9Mesem'
              };
            }
            return student;
          });
          
          console.log('Filtrelenmiş veri (11A ve 11H hariç):', filteredData);
          setStudentStatuses(filteredData);
        }
      } catch (err) {
        setError('Veri yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentYear]);

  // Otomatik yazdırma kaldırıldı - sadece manual yazdırma butonuna basılınca çalışacak

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Dekont durumları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Hata: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Yeniden Yükle
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 10px; font-size: 10px; }
          .no-print { display: none !important; }
          .print-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 8px;
            margin-top: 10px;
          }
          .print-table th, .print-table td { 
            border: 1px solid #000; 
            padding: 3px 2px; 
            text-align: center;
            word-wrap: break-word;
          }
          .print-table th { 
            background-color: #f0f0f0; 
            font-weight: bold;
            font-size: 7px;
          }
          .print-table .student-info {
            text-align: left;
            font-size: 7px;
            min-width: 120px;
            max-width: 120px;
          }
          .print-table .class-col {
            min-width: 30px;
            max-width: 30px;
            font-size: 6px;
          }
          .print-table .month-col {
            min-width: 25px;
            max-width: 25px;
            font-size: 9px;
          }
          .print-header {
            text-align: center;
            margin-bottom: 15px;
          }
          .print-header h1 {
            font-size: 14px;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .print-header p {
            font-size: 9px;
            margin: 2px 0;
          }
        }
        
        @media screen {
          .print-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          .print-table th, .print-table td {
            border: 1px solid #ddd;
            padding: 8px 4px;
            text-align: center;
          }
          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .print-table .student-info {
            text-align: left;
            min-width: 150px;
          }
        }
      `}</style>

      <div className="print-container">
        {/* Header */}
        <div className="print-header">
          <h1>Hüsniye Özdilek M.T.A.L Bilişim Alanı</h1>
          <p>İşletme Dekontları - Aylık Durum Raporu</p>
          <p>Akademik Yıl: {currentYear}-{currentYear + 1}</p>
          <p>Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
          <p style={{ marginTop: '10px' }}>
            <strong>✅ = Dekont Gönderildi</strong> | <strong>❌ = Dekont Gönderilmedi</strong>
          </p>
        </div>

        {/* Control Buttons - Sadece ekranda görünür */}
        <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4"
          >
            🖨️ Yazdır
          </button>
          <button 
            onClick={() => window.close()}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ❌ Kapat
          </button>
        </div>

        {/* Main Table */}
        {studentStatuses.length === 0 ? (
          <div className="text-center py-8">
            <p>Öğrenci dekont verisi bulunamadı.</p>
          </div>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th className="student-info">Öğrenci Bilgileri</th>
                <th className="class-col">Sınıf</th>
                {academicMonths.map(month => (
                  <th key={month} className="month-col">
                    {monthNames[month].substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentStatuses
                .sort((a, b) => {
                  // Önce sınıfa göre, sonra isme göre sırala
                  const classCompare = a.student_class_name.localeCompare(b.student_class_name, 'tr');
                  if (classCompare !== 0) return classCompare;
                  return a.student_name.localeCompare(b.student_name, 'tr');
                })
                .map((student) => (
                <tr key={student.student_id}>
                  <td className="student-info">
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                      {student.student_name}
                    </div>
                    <div style={{ fontSize: '90%', color: '#666' }}>
                      No: {student.student_school_number}
                    </div>
                  </td>
                  <td className="class-col">
                    {student.student_class_name}
                  </td>
                  {academicMonths.map(month => {
                    const status = student.monthly_status[month];
                    return (
                      <td key={month} className="month-col">
                        {status?.has_receipt ? (
                          <span style={{ color: '#10B981', fontSize: '14px' }}>✅</span>
                        ) : (
                          <span style={{ color: '#EF4444', fontSize: '14px' }}>❌</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer - Sadece yazdırmada görünür */}
        <div style={{ marginTop: '20px', fontSize: '8px', textAlign: 'center' }}>
          <p>Bu rapor {new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
          <p>Toplam Öğrenci Sayısı: {studentStatuses.length}</p>
        </div>
      </div>
    </>
  );
} 