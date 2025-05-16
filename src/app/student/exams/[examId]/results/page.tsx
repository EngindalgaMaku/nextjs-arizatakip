'use client';

import { getLiveExamById, getLiveExamParticipants } from "@/actions/liveExamActions";
import { getTestById } from "@/actions/testActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LiveExam, LiveExamParticipant, ParticipantStatus, Test, TestQuestion } from "@/types/tests";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { format, formatDistanceStrict } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ExamResultsPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const examId = params.examId;
  
  const [exam, setExam] = useState<LiveExam | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [participant, setParticipant] = useState<LiveExamParticipant | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Gerçek uygulamada bu değer kimlik doğrulama ve kullanıcı oturumundan alınacak
  const studentId = "current-student-id"; // TODO: Gerçek kimlik ile değiştirilecek
  
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        // Sınav detaylarını al
        const examData = await getLiveExamById(examId);
        if (!examData) {
          toast.error('Sınav bulunamadı.');
          router.push('/student/exams');
          return;
        }
        
        setExam(examData);
        
        // Test detaylarını al
        const testData = await getTestById(examData.testId);
        if (!testData) {
          toast.error('Test bilgisi alınamadı.');
          router.push('/student/exams');
          return;
        }
        
        setTest(testData);
        setQuestions(testData.questions);
        
        // Öğrencinin katılım detaylarını al
        const participants = await getLiveExamParticipants(examId);
        const studentParticipants = participants.filter(p => p.studentId === studentId);
        
        // En son denemeyi al
        if (studentParticipants.length > 0) {
          const latestAttempt = studentParticipants.sort(
            (a, b) => b.attemptNumber - a.attemptNumber
          )[0];
          
          setParticipant(latestAttempt);
        } else {
          toast.error('Bu sınava katılım bilginiz bulunamadı.');
          router.push('/student/exams');
          return;
        }
      } catch (error) {
        console.error('Error fetching results:', error);
        toast.error('Sonuçlar yüklenirken bir hata oluştu.');
        router.push('/student/exams');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [examId, router, studentId]);
  
  // Yükleme durumu
  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Yükleniyor</div>
            <div className="text-sm text-gray-500">Sınav sonuçları yükleniyor...</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Veriler yoksa
  if (!exam || !test || !participant) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Sonuç Bulunamadı</div>
            <div className="text-sm text-gray-500 mb-4">Bu sınav için sonuç bulunamadı.</div>
            <Button onClick={() => router.push('/student/exams')}>Sınavlara Dön</Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Sonuç yayınlanmamışsa ve henüz sınav tamamlanmamışsa
  if (participant.score === undefined && participant.status !== ParticipantStatus.COMPLETED) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">{exam.title}</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Sonuçlar Henüz Yayınlanmadı</CardTitle>
            <CardDescription>
              Sınav sonuçları henüz açıklanmamış veya sınavınız tamamlanmamış.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-10">
            <p className="mb-4">
              {participant.status === ParticipantStatus.IN_PROGRESS && "Sınavınız henüz devam ediyor."}
              {participant.status === ParticipantStatus.REGISTERED && "Sınava henüz başlamadınız."}
              {participant.status === ParticipantStatus.TIMED_OUT && "Sınavınızın süresi doldu, sonuçlar yakında yayınlanacak."}
              {participant.status === ParticipantStatus.DISQUALIFIED && "Sınavınız diskalifiye edildi."}
            </p>
            <Button onClick={() => router.push('/student/exams')}>Sınavlara Dön</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Cevap bilgilerini hazırla
  const answers = participant.answers || {};
  const correctAnswers = questions.filter(q => answers[q.id] === q.correctOptionId).length;
  const incorrectAnswers = Object.keys(answers).length - correctAnswers;
  const notAnswered = questions.length - Object.keys(answers).length;
  const scorePercentage = participant.score !== undefined ? participant.score : 
    Math.round((correctAnswers / questions.length) * 100);
  
  // Cevapları doğruluk durumuna göre işaretle
  const markedQuestions = questions.map(q => ({
    ...q,
    isCorrect: answers[q.id] === q.correctOptionId,
    isAnswered: answers[q.id] !== undefined,
    userAnswer: answers[q.id]
  }));
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{exam.title}</h1>
          <p className="text-gray-500">{test.title}</p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => router.push('/student/exams')}
          className="mt-4 md:mt-0"
        >
          Sınavlara Dön
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sınav Sonucu</CardTitle>
          <CardDescription>
            {participant.submitTime && format(new Date(participant.submitTime), 'dd MMMM yyyy - HH:mm', { locale: tr })}
            {' • '}
            {participant.startTime && participant.submitTime && 
              `Süre: ${formatDistanceStrict(
                new Date(participant.submitTime), 
                new Date(participant.startTime), 
                { locale: tr }
              )}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-medium">Puan</div>
                <div className="text-2xl font-bold">
                  {scorePercentage}
                  <span className="text-base font-normal text-gray-500">/100</span>
                </div>
              </div>
              
              <Progress value={scorePercentage} className="h-3 mb-6" />
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>Geçme Notu</div>
                  <div className="font-semibold">{test.passingScore || 70}/100</div>
                </div>
                
                <div className="flex justify-between">
                  <div>Başarı Durumu</div>
                  <div>
                    {participant.isPassed ? (
                      <Badge className="bg-green-500">Başarılı</Badge>
                    ) : (
                      <Badge variant="destructive">Başarısız</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <div>Deneme</div>
                  <div className="font-semibold">{participant.attemptNumber}. deneme</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-lg font-medium mb-4">Soru İstatistikleri</div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <div className="flex-1">Doğru</div>
                  <div className="font-semibold">{correctAnswers}</div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <div className="flex-1">Yanlış</div>
                  <div className="font-semibold">{incorrectAnswers}</div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                  <div className="flex-1">Boş</div>
                  <div className="font-semibold">{notAnswered}</div>
                </div>
                
                <div className="flex items-center pt-2 border-t">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <div className="flex-1">Toplam</div>
                  <div className="font-semibold">{questions.length}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <h2 className="text-2xl font-bold mb-4">Soru Analizi</h2>
      
      <div className="space-y-8">
        {markedQuestions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Soru {index + 1}</CardTitle>
                {question.isAnswered ? (
                  question.isCorrect ? (
                    <Badge className="bg-green-500 flex items-center">
                      <CheckCircledIcon className="mr-1 h-4 w-4" /> Doğru
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center">
                      <CrossCircledIcon className="mr-1 h-4 w-4" /> Yanlış
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline">Boş</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4" dangerouslySetInnerHTML={{ __html: question.text }} />
              
              <div className="space-y-2">
                {question.options.map(option => (
                  <div
                    key={option.id}
                    className={`p-3 border rounded-md ${
                      option.id === question.correctOptionId
                        ? "border-green-500 bg-green-50"
                        : option.id === question.userAnswer
                        ? "border-red-500 bg-red-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        {option.text}
                      </div>
                      <div>
                        {option.id === question.correctOptionId && (
                          <CheckCircledIcon className="h-5 w-5 text-green-500" />
                        )}
                        {option.id === question.userAnswer && option.id !== question.correctOptionId && (
                          <CrossCircledIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 