'use client';

import { getLiveExamById, registerStudentForExam, startExamForStudent, submitExamForStudent, updateStudentAnswers } from "@/actions/liveExamActions";
import { getTestById } from "@/actions/testActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { LiveExam, LiveExamParticipant, LiveExamStatus, ParticipantStatus, Test, TestQuestion } from "@/types/tests";
import { addMinutes, differenceInSeconds } from "date-fns";
import { InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function TakeExamPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const examId = params.examId;
  
  const [exam, setExam] = useState<LiveExam | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [participant, setParticipant] = useState<LiveExamParticipant | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Gerçek uygulamada bu değer kimlik doğrulama ve kullanıcı oturumundan alınacak
  const studentId = "current-student-id"; // TODO: Gerçek kimlik ile değiştirilecek
  
  useEffect(() => {
    // Sınav ve test bilgilerini yükle
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Sınav bilgisini al
        const examData = await getLiveExamById(examId);
        if (!examData) {
          toast.error('Sınav bulunamadı.');
          router.push('/student/exams');
          return;
        }
        
        setExam(examData);
        
        // Sınavın durumunu kontrol et
        if (examData.status !== LiveExamStatus.ACTIVE) {
          if (examData.status === LiveExamStatus.COMPLETED) {
            router.push(`/student/exams/${examId}/results`);
            return;
          }
          
          toast.error('Bu sınav şu anda aktif değil.');
          router.push('/student/exams');
          return;
        }
        
        // Test bilgisini al
        const testData = await getTestById(examData.testId);
        if (!testData) {
          toast.error('Test bilgisi alınamadı.');
          router.push('/student/exams');
          return;
        }
        
        setTest(testData);
        
        // Soruları işle
        let processedQuestions = [...testData.questions];
        
        // Eğer sorular karıştırılacaksa
        if (examData.randomizeQuestions) {
          processedQuestions = shuffleArray([...processedQuestions]);
        }
        
        // Eğer seçenekler karıştırılacaksa
        if (examData.randomizeOptions) {
          processedQuestions = processedQuestions.map(q => ({
            ...q,
            options: shuffleArray([...q.options])
          }));
        }
        
        setQuestions(processedQuestions);
        
        // Öğrenciyi sınava kaydet veya mevcut kaydını al
        let participantData: LiveExamParticipant | { error: string };
        participantData = await registerStudentForExam(examId, studentId);
        
        // Eğer sınavı başlatmak gerekiyorsa
        if (!('error' in participantData) && participantData.status === ParticipantStatus.REGISTERED) {
          participantData = await startExamForStudent(
            examId, 
            studentId, 
            window.location.hostname, // IP yerine hostname
            navigator.userAgent // Cihaz bilgisi
          );
        }
        
        if ('error' in participantData) {
          toast.error(participantData.error);
          router.push('/student/exams');
          return;
        }
        
        setParticipant(participantData);
        
        // Mevcut cevapları al
        if (participantData.answers) {
          setAnswers(participantData.answers);
        }
        
        // Sınav süresini başlat
        if (participantData.startTime) {
          const startTime = new Date(participantData.startTime);
          const endTime = addMinutes(startTime, examData.timeLimit);
          const remainingSeconds = Math.max(0, differenceInSeconds(endTime, new Date()));
          setTimeLeft(remainingSeconds);
          
          // Süre takip intervalı
          const interval = setInterval(() => {
            setTimeLeft(prevTime => {
              if (prevTime === null || prevTime <= 0) {
                clearInterval(interval);
                handleTimeUp();
                return 0;
              }
              return prevTime - 1;
            });
          }, 1000);
          
          setTimerInterval(interval);
        }
        
        // İlerleme takip intervalı
        const progressInterval = setInterval(() => {
          updateProgress();
        }, 30000); // 30 saniyede bir ilerlemeyi kaydet
        
        setProgressInterval(progressInterval);
      } catch (error) {
        console.error('Error loading exam:', error);
        toast.error('Sınav yüklenirken bir hata oluştu.');
        router.push('/student/exams');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Component unmount olduğunda intervalleri temizle
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [examId, router, studentId]);
  
  // İlerlemeyi sunucuya gönder
  const updateProgress = async () => {
    if (!participant || !exam) return;
    
    try {
      // İlerleme yüzdesini hesapla
      const answeredCount = Object.keys(answers).length;
      const totalQuestions = questions.length;
      const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
      
      // Sunucuya gönder
      const result = await updateStudentAnswers(examId, studentId, answers, progress);
      
      if ('error' in result) {
        console.error('Error updating progress:', result.error);
      } else {
        setParticipant(result);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };
  
  // Süre dolduğunda
  const handleTimeUp = async () => {
    toast.error('Süreniz doldu! Cevaplarınız otomatik olarak gönderiliyor.');
    await handleSubmitExam(false);
  };
  
  // Cevap seçme
  const handleAnswerSelect = (questionId: number, optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };
  
  // Bir sonraki soruya geç
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Bir önceki soruya dön
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Belirli bir soruya git
  const handleGotoQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };
  
  // Sınavı bitir
  const handleSubmitExam = async (showConfirmation = true) => {
    if (showConfirmation) {
      setConfirmSubmitOpen(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Son kez ilerlemeyi güncelle
      await updateProgress();
      
      // Sınavı bitir
      const result = await submitExamForStudent(examId, studentId, answers);
      
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Sınavınız başarıyla tamamlandı!');
        router.push(`/student/exams/${examId}/results`);
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Sınav gönderilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
      setConfirmSubmitOpen(false);
    }
  };
  
  // Cevapların genel durumu
  const getAnswerStats = () => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = questions.length;
    const unansweredCount = totalQuestions - answeredCount;
    const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    
    return { answeredCount, unansweredCount, totalQuestions, progress };
  };
  
  // Yükleme durumu
  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Yükleniyor</div>
            <div className="text-sm text-gray-500">Sınav hazırlanıyor...</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Sınav veya test bulunamadıysa
  if (!exam || !test || !questions.length || !participant) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Sınav Bulunamadı</div>
            <div className="text-sm text-gray-500 mb-4">İstediğiniz sınav bulunamadı veya erişim izniniz yok.</div>
            <Button onClick={() => router.push('/student/exams')}>Sınavlara Dön</Button>
          </div>
        </div>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  const { answeredCount, unansweredCount, totalQuestions, progress } = getAnswerStats();
  
  // Kalan süreyi formatla
  const formatRemainingTime = () => {
    if (timeLeft === null) return '--:--';
    
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  
  return (
    <div className="container mx-auto py-10">
      {/* Üst Bilgi Alanı */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{exam.title}</h1>
          <p className="text-gray-500">{test.title}</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Kalan Süre</div>
            <div className={`text-xl font-mono ${timeLeft && timeLeft < 300 ? 'text-red-500' : ''}`}>
              {formatRemainingTime()}
            </div>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={() => handleSubmitExam()} 
            disabled={isSubmitting}
          >
            Sınavı Bitir
          </Button>
        </div>
      </div>
      
      {/* İlerleme Durumu */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-2">
            <div className="flex items-center gap-4 mb-2 md:mb-0">
              <div>
                <span className="font-medium">{currentQuestionIndex + 1}</span> / {totalQuestions}. soru
              </div>
              <div>
                <span className="font-medium text-green-600">{answeredCount}</span> cevaplanan
              </div>
              <div>
                <span className="font-medium text-red-600">{unansweredCount}</span> boş
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <Progress value={progress} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Soru Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Soru Listesi (Mobilde gizli) */}
        <div className="hidden md:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sorular</CardTitle>
              <CardDescription>Soruya gitmek için tıklayın</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => (
                  <Button
                    key={q.id}
                    variant={currentQuestionIndex === index ? "default" : answers[q.id] ? "outline" : "ghost"}
                    className={`h-10 w-10 p-0 ${answers[q.id] ? "border-green-500" : ""}`}
                    onClick={() => handleGotoQuestion(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Aktif Soru */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Soru {currentQuestionIndex + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6" dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />
              
              <div className="space-y-3">
                {currentQuestion.options.map(option => (
                  <div
                    key={option.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === option.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                  >
                    {option.text}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                Önceki Soru
              </Button>
              
              <div className="md:hidden">
                <Button
                  variant="secondary"
                  onClick={() => document.getElementById('question-nav-dialog')?.click()}
                >
                  {currentQuestionIndex + 1} / {totalQuestions}
                </Button>
                
                <Dialog>
                  <Button id="question-nav-dialog" className="hidden">Open</Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sorular</DialogTitle>
                      <DialogDescription>
                        Gitmek istediğiniz soruyu seçin
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-5 gap-2 py-4">
                      {questions.map((q, index) => (
                        <Button
                          key={q.id}
                          variant={currentQuestionIndex === index ? "default" : answers[q.id] ? "outline" : "ghost"}
                          className={`h-10 w-10 p-0 ${answers[q.id] ? "border-green-500" : ""}`}
                          onClick={() => {
                            handleGotoQuestion(index);
                            document.querySelector('[data-state="open"][data-type="dialog"]')?.dispatchEvent(
                              new KeyboardEvent('keydown', {
                                key: 'Escape',
                                bubbles: true
                              })
                            );
                          }}
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Button
                variant="outline"
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Sonraki Soru
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Teslim Onay Dialogu */}
      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sınavı Tamamla</DialogTitle>
            <DialogDescription>
              Sınavı tamamlamak üzeresiniz. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Dikkat</AlertTitle>
              <AlertDescription>
                {answeredCount === totalQuestions ? (
                  'Tüm soruları cevapladınız.'
                ) : (
                  <>
                    {unansweredCount} soruyu boş bıraktınız. 
                    Sınavı tamamladığınızda boş bıraktığınız sorulara daha sonra dönemezsiniz.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={() => handleSubmitExam(false)} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'İşleniyor...' : 'Sınavı Tamamla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Diziyi karıştırmak için yardımcı fonksiyon
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
} 