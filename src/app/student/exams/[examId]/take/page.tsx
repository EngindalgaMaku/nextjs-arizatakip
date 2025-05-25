'use client';

import { registerStudentForExam, startExamForStudent, submitExamForStudent, updateStudentAnswers } from '@/actions/liveExamActions';
import supabase from '@/lib/supabase-browser';
import { ArrowPathIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

interface ExamQuestion {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
  }[];
  imageUrl?: string;
}

interface ExamData {
  id: string;
  title: string;
  timeLimit: number;
  questions: ExamQuestion[];
}

const answerSchema = z.object({
  answers: z.record(z.string(), z.string())
});

type AnswerFormValues = z.infer<typeof answerSchema>;

export default function TakeExam() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const urlStudentId = searchParams.get('studentId');
  const [resolvedStudentId, setResolvedStudentId] = useState<string | null>(urlStudentId);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isDirty }
  } = useForm<AnswerFormValues>({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answers: {}
    }
  });

  const onSubmit = useCallback(async (data: AnswerFormValues) => {
    if (!examData || !resolvedStudentId) {
      toast.error("Sınav verileri veya öğrenci bilgisi eksik.");
      console.error("[onSubmit] Missing examData or resolvedStudentId");
      return;
    }
    console.log("[onSubmit] Attempting to submit exam. examId:", examId, "studentId:", resolvedStudentId);
    setIsSubmitting(true);
    setError(null);
    try {
      // Orijinal soru sıralamasını oluştur
      const questionOrder = examData.questions.map((q, index) => ({
        questionId: q.id,
        originalIndex: index
      }));

      console.log("[onSubmit] Calling submitExamForStudent with answers:", data.answers);
      const result = await submitExamForStudent(examId, resolvedStudentId, data.answers, questionOrder);
      console.log("[onSubmit] submitExamForStudent result:", JSON.stringify(result, null, 2));

      if (result.error) {
        console.error("[onSubmit] Error submitting exam:", result.error);
        toast.error(`Sınav gönderilemedi: ${result.error}`);
        setError(`Sınav gönderilemedi: ${result.error}`);
      } else {
        console.log("[onSubmit] Exam submitted successfully. Participant data:", JSON.stringify(result, null, 2));
        toast.success("Sınav başarıyla gönderildi!");
        console.log("[onSubmit] Navigating to results page:", `/student/exams/${examId}/results?studentId=${resolvedStudentId}`);
        router.push(`/student/exams/${examId}/results?studentId=${resolvedStudentId}`);
      }
    } catch (err: any) {
      console.error("[onSubmit] Unexpected error during submission:", err);
      const message = err.message || 'Sınav gönderilirken beklenmedik bir hata oluştu.';
      toast.error(message);
      setError(message);
    } finally {
      console.log("[onSubmit] Submission process finished.");
      setIsSubmitting(false);
    }
  }, [examId, resolvedStudentId, router]);

  useEffect(() => {
    if (!urlStudentId && typeof window !== 'undefined') {
      const sessionData = localStorage.getItem('studentExamSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session?.studentId) {
          setResolvedStudentId(session.studentId);
        } else {
          toast.error("Oturum bilgileri geçersiz.");
          router.replace('/student/exams');
        }
      } else {
        toast.error("Oturum bulunamadı, lütfen giriş yapın.");
        router.replace('/student/exams');
      }
    }
  }, [urlStudentId, examId, router]);

  useEffect(() => {
    if (!resolvedStudentId || !examId) return;

    const initializeExamParticipation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const registerResult = await registerStudentForExam(examId, resolvedStudentId);
        if ('error' in registerResult) {
          if (!registerResult.error.includes("maksimum deneme") && !registerResult.error.includes("zaten kayıtlı")) {
            if (registerResult.error.includes("zaten tamamladınız")) {
              router.replace(`/student/exams/${examId}/results?studentId=${resolvedStudentId}`);
              return;
            }
            toast.error(`Sınava kayıt başarısız: ${registerResult.error}`);
            setError(`Sınava kayıt başarısız: ${registerResult.error}`);
            setIsLoading(false);
            return;
          }
        }
        const startResult = await startExamForStudent(examId, resolvedStudentId);
        if ('error' in startResult) {
          toast.error(`Sınav başlatılamadı: ${startResult.error}`);
          setError(`Sınav başlatılamadı: ${startResult.error}`);
          setIsLoading(false);
          return;
        }

        const { data: exam, error: examError } = await supabase
          .from('live_exams')
          .select('id, title, time_limit, status, test_id, tests(questions)')
          .eq('id', examId)
          .single();

        if (examError) throw examError;
        if (!exam) throw new Error("Sınav detayları bulunamadı.");

        if (exam.status !== 'active') {
          toast.error('Bu sınav şu anda aktif değil.');
          setError('Bu sınav şu anda aktif değil.');
          setIsLoading(false);
          return;
        }

        if (!exam.tests || !Array.isArray(exam.tests.questions)) {
             console.error("Fetched exam data is missing questions:", exam);
             throw new Error("Sınav soruları yüklenemedi veya formatı yanlış.");
        }

        const mappedQuestions: ExamQuestion[] = exam.tests.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          options: q.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text
          })),
          imageUrl: q.image_url
        }));

        setExamData({
          id: exam.id,
          title: exam.title,
          timeLimit: exam.time_limit,
          questions: mappedQuestions
        });
        setTimeLeft(exam.time_limit * 60);

      } catch (err: any) {
        console.error("Error in exam participation/fetch data:", err);
        const message = err.message || 'Sınav bilgileri yüklenirken bir hata oluştu.';
        toast.error(message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeExamParticipation();

  }, [resolvedStudentId, examId, router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit(onSubmit)();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit, onSubmit]);

  useEffect(() => {
    if (!examData || !resolvedStudentId || !examId) return;
    const progress = (Object.keys(watch('answers')).length / examData.questions.length) * 100;
    updateStudentAnswers(examId, resolvedStudentId, watch('answers'), progress);
  }, [watch('answers'), currentQuestion, examData, examId, resolvedStudentId]);

  if (!resolvedStudentId) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="ml-4 text-lg text-gray-700">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-lg text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!examData) return null;

  const currentQ = examData.questions[currentQuestion];

  return (
    <div className="container mx-auto p-6">
      {/* Onay Modalı */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full flex flex-col items-center">
            <div className="text-xl font-bold text-red-700 mb-2">Sınavı Bitir?</div>
            <div className="text-gray-800 text-center mb-4">
              Sınavı bitirdikten sonra tekrar giriş yapamazsınız.<br />
              Süreniz varsa soruları tekrar gözden geçirebilirsiniz.<br />
              <span className="font-semibold text-red-600">Emin misiniz?</span>
            </div>
            <div className="flex gap-4 w-full mt-2">
              <button
                className="flex-1 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                onClick={() => setShowConfirm(false)}
              >
                Hayır, Vazgeç
              </button>
              <button
                className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                onClick={handleSubmit(onSubmit)}
              >
                Evet, Sınavı Bitir
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{examData.title}</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Soru {currentQuestion + 1} / {examData.questions.length}
            </div>
            <div
              className={`text-lg font-bold px-4 py-2 rounded-lg shadow-sm border transition-colors duration-300 ${timeLeft <= 600 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-indigo-100 text-indigo-800 border-indigo-300'}`}
              style={{ minWidth: 90, textAlign: 'center', letterSpacing: 1 }}
            >
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {`${currentQuestion + 1}. Soru`}
            </h2>
            <div className="text-base font-normal text-gray-900 mb-4">
              {currentQ.text}
            </div>
            
            {currentQ.imageUrl && (
              <div className="mb-4">
                <img
                  src={currentQ.imageUrl}
                  alt="Soru görseli"
                  className="max-w-md rounded-lg"
                />
              </div>
            )}

            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const harf = String.fromCharCode(65 + idx);
                const isChecked = watch(`answers.${currentQ.id}`) === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors duration-150 ${isChecked ? 'bg-indigo-100 border-indigo-400' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full font-bold mr-3 text-base border ${isChecked ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-indigo-300'}`}>{harf}</span>
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={option.id}
                      checked={isChecked}
                      onChange={(e) => {
                        setValue(`answers.${currentQ.id}`, e.target.value);
                      }}
                      className="h-4 w-4 text-indigo-600 hidden"
                    />
                    <span className="text-gray-900">{option.text}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentQuestion(prev => Math.min(examData.questions.length - 1, prev + 1))}
              disabled={currentQuestion === examData.questions.length - 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting}
              className="px-6 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5 mr-2" />
                  Sınavı Bitir
                </>
              )}
            </button>
          </div>
        </div>

        {/* Soru Navigasyonu */}
        <div className="mt-8 bg-white rounded-lg shadow p-4">
          <div className="font-semibold mb-2 text-gray-700">Sorular</div>
          <div className="grid grid-cols-20 gap-2 overflow-x-auto" style={{ minWidth: 400 }}>
            {examData.questions.map((q, idx) => {
              const answered = !!watch(`answers.${q.id}`);
              const isCurrent = idx === currentQuestion;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`w-8 h-8 rounded flex items-center justify-center font-bold border transition-colors duration-150
                    ${isCurrent ? 'bg-indigo-600 text-white border-indigo-700' : answered ? 'bg-green-100 text-green-700 border-green-400' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 