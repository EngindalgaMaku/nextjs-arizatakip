'use client';

import { getLiveExamsForStudent } from "@/actions/liveExamActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveExam, LiveExamStatus } from "@/types/tests";
import { formatDistanceToNow, isFuture, isPast } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function StudentExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<LiveExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Gerçek uygulamada bu değerler kimlik doğrulama ve kullanıcı oturumundan alınacak
  // Şimdilik sabit değerler kullanıyoruz
  const studentId = "current-student-id"; // TODO: Gerçek kimlik ile değiştirilecek
  const studentClassIds = ["class-1", "class-2"]; // TODO: Gerçek sınıf ID'leri ile değiştirilecek
  
  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const examsData = await getLiveExamsForStudent(studentId, studentClassIds);
        setExams(examsData);
      } catch (error) {
        console.error('Error fetching exams:', error);
        toast.error('Sınavlar yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExams();
  }, [studentId]);
  
  // Sınavları aktif, yaklaşan ve geçmiş olarak grupla
  const activeExams = exams.filter(exam => exam.status === LiveExamStatus.ACTIVE);
  const upcomingExams = exams.filter(exam => 
    exam.status === LiveExamStatus.SCHEDULED && 
    isFuture(new Date(exam.scheduledStartTime))
  );
  const pastExams = exams.filter(exam => 
    (exam.status === LiveExamStatus.COMPLETED || 
     exam.status === LiveExamStatus.CANCELLED ||
     (exam.status === LiveExamStatus.SCHEDULED && isPast(new Date(exam.scheduledEndTime))))
  );
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Sınavlarım</h1>
      
      {isLoading ? (
        <div className="text-center py-10">Yükleniyor...</div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Aktif Sınavlar</h2>
            {activeExams.length === 0 ? (
              <p className="text-gray-500">Şu an aktif bir sınav bulunmuyor.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeExams.map(exam => (
                  <ExamCard 
                    key={exam.id} 
                    exam={exam} 
                    status="active"
                    onTakeExam={() => router.push(`/student/exams/${exam.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
          
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Yaklaşan Sınavlar</h2>
            {upcomingExams.length === 0 ? (
              <p className="text-gray-500">Yaklaşan bir sınav bulunmuyor.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingExams.map(exam => (
                  <ExamCard 
                    key={exam.id} 
                    exam={exam} 
                    status="upcoming"
                    onTakeExam={() => {}} // Yaklaşan sınavlar için erişim yok
                  />
                ))}
              </div>
            )}
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Geçmiş Sınavlar</h2>
            {pastExams.length === 0 ? (
              <p className="text-gray-500">Henüz tamamlanmış bir sınav bulunmuyor.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastExams.map(exam => (
                  <ExamCard 
                    key={exam.id} 
                    exam={exam} 
                    status="past"
                    onTakeExam={() => router.push(`/student/exams/${exam.id}/results`)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

interface ExamCardProps {
  exam: LiveExam;
  status: 'active' | 'upcoming' | 'past';
  onTakeExam: () => void;
}

function ExamCard({ exam, status, onTakeExam }: ExamCardProps) {
  const startDate = new Date(exam.scheduledStartTime);
  const endDate = new Date(exam.scheduledEndTime);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{exam.title}</CardTitle>
        <CardDescription>{exam.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="text-sm font-medium">Süre</div>
          <div>{exam.timeLimit} dakika</div>
        </div>
        
        <div>
          <div className="text-sm font-medium">
            {status === 'active' ? 'Bitiş' : status === 'upcoming' ? 'Başlangıç' : 'Tamamlanma'}
          </div>
          <div>
            {status === 'active' && (
              <>Kalan süre: {formatDistanceToNow(endDate, { addSuffix: false })}</>
            )}
            {status === 'upcoming' && (
              <>Başlangıç: {formatDistanceToNow(startDate, { addSuffix: true })}</>
            )}
            {status === 'past' && (
              <>Sınav tamamlandı</>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {status === 'active' && (
          <Button onClick={onTakeExam} className="w-full">Sınava Başla</Button>
        )}
        {status === 'upcoming' && (
          <Button disabled className="w-full">Henüz Başlamadı</Button>
        )}
        {status === 'past' && (
          <Button variant="outline" onClick={onTakeExam} className="w-full">
            Sonuçları Görüntüle
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 