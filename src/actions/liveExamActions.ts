import { supabase } from '@/lib/supabaseClient';
import {
    LiveExam,
    LiveExamCreationParams,
    LiveExamParticipant,
    LiveExamStatus,
    LiveExamUpdateParams,
    ParticipantStatus,
    Test
} from '@/types/tests';
import { getTestById } from './testActions';

// Supabase tablo adları
const LIVE_EXAMS_TABLE = 'live_exams';
const PARTICIPANTS_TABLE = 'live_exam_participants';

// LiveExam DB satırından UI tipine dönüştürmek için
function mapSupabaseRowToLiveExam(row: any): LiveExam {
  return {
    id: row.id,
    testId: row.test_id,
    title: row.title,
    description: row.description,
    timeLimit: row.time_limit,
    scheduledStartTime: new Date(row.scheduled_start_time),
    scheduledEndTime: new Date(row.scheduled_end_time),
    actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : undefined,
    actualEndTime: row.actual_end_time ? new Date(row.actual_end_time) : undefined,
    status: row.status as LiveExamStatus,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    studentIds: row.student_ids,
    classIds: row.class_ids,
    autoPublishResults: row.auto_publish_results,
    allowLateSubmissions: row.allow_late_submissions,
    maxAttempts: row.max_attempts,
    randomizeQuestions: row.randomize_questions,
    randomizeOptions: row.randomize_options
  };
}

// LiveExamParticipant DB satırından UI tipine dönüştürmek için
function mapSupabaseRowToParticipant(row: any): LiveExamParticipant {
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    status: row.status as ParticipantStatus,
    startTime: row.start_time ? new Date(row.start_time) : undefined,
    submitTime: row.submit_time ? new Date(row.submit_time) : undefined,
    lastActiveTime: row.last_active_time ? new Date(row.last_active_time) : undefined,
    ipAddress: row.ip_address,
    deviceInfo: row.device_info,
    progress: row.progress,
    answers: row.answers,
    score: row.score,
    isPassed: row.is_passed,
    attemptNumber: row.attempt_number
  };
}

// --- Veri Çekme Fonksiyonları ---

// Bütün canlı sınavları çek
export async function getLiveExams(): Promise<LiveExam[]> {
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching live exams:', error);
    return [];
  }
  
  return data ? data.map(mapSupabaseRowToLiveExam) : [];
}

// ID ile canlı sınav getir
export async function getLiveExamById(examId: string): Promise<LiveExam | null> {
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .eq('id', examId)
    .maybeSingle();
    
  if (error) {
    console.error(`Error fetching live exam by id ${examId}:`, error);
    return null;
  }
  
  return data ? mapSupabaseRowToLiveExam(data) : null;
}

// Öğretmenin oluşturduğu canlı sınavları getir
export async function getLiveExamsByTeacher(teacherId: string): Promise<LiveExam[]> {
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .eq('created_by', teacherId)
    .order('scheduled_start_time', { ascending: false });
    
  if (error) {
    console.error(`Error fetching live exams by teacher ${teacherId}:`, error);
    return [];
  }
  
  return data ? data.map(mapSupabaseRowToLiveExam) : [];
}

// Öğrencinin katılabileceği sınavları getir
export async function getLiveExamsForStudent(studentId: string, classIds: string[]): Promise<LiveExam[]> {
  // Öğrencinin katılabileceği sınavlar:
  // 1. Doğrudan öğrenci ID'sine göre izin verilenler
  // 2. Öğrencinin sınıflarına göre izin verilenler
  // 3. Herkese açık sınavlar (studentIds ve classIds boş olanlar)
  
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .or(`student_ids.cs.{${studentId}},class_ids.cs.{${classIds.join(',')}},and(student_ids.is.null,class_ids.is.null)`)
    .in('status', [LiveExamStatus.SCHEDULED, LiveExamStatus.ACTIVE])
    .gte('scheduled_end_time', new Date().toISOString());
    
  if (error) {
    console.error(`Error fetching live exams for student ${studentId}:`, error);
    return [];
  }
  
  return data ? data.map(mapSupabaseRowToLiveExam) : [];
}

// Canlı sınavın katılımcılarını getir
export async function getLiveExamParticipants(examId: string): Promise<LiveExamParticipant[]> {
  const { data, error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .select('*')
    .eq('exam_id', examId)
    .order('last_active_time', { ascending: false });
    
  if (error) {
    console.error(`Error fetching participants for exam ${examId}:`, error);
    return [];
  }
  
  return data ? data.map(mapSupabaseRowToParticipant) : [];
}

// --- CRUD İşlemleri ---

// Yeni canlı sınav oluştur
export async function createLiveExam(
  teacherId: string, 
  params: LiveExamCreationParams
): Promise<LiveExam | { error: string }> {
  try {
    // Önce referans alınan testi kontrol et
    const test = await getTestById(params.testId);
    if (!test) {
      return { error: 'Referans alınan test bulunamadı.' };
    }
    
    const now = new Date();
    
    // Sınav başlangıç zamanı geçmişte olamaz
    if (params.scheduledStartTime < now) {
      return { error: 'Sınav başlangıç zamanı geçmişte olamaz.' };
    }
    
    // Bitiş zamanı başlangıç zamanından sonra olmalı
    if (params.scheduledEndTime <= params.scheduledStartTime) {
      return { error: 'Sınav bitiş zamanı başlangıç zamanından sonra olmalı.' };
    }
    
    const newLiveExam = {
      test_id: params.testId,
      title: params.title || test.title,
      description: params.description || test.description,
      time_limit: params.timeLimit,
      scheduled_start_time: params.scheduledStartTime.toISOString(),
      scheduled_end_time: params.scheduledEndTime.toISOString(),
      status: LiveExamStatus.SCHEDULED,
      created_by: teacherId,
      student_ids: params.studentIds || null,
      class_ids: params.classIds || null,
      auto_publish_results: params.autoPublishResults,
      allow_late_submissions: params.allowLateSubmissions,
      max_attempts: params.maxAttempts,
      randomize_questions: params.randomizeQuestions,
      randomize_options: params.randomizeOptions
    };
    
    const { data, error } = await supabase
      .from(LIVE_EXAMS_TABLE)
      .insert(newLiveExam)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating live exam:', error);
      return { error: `Canlı sınav oluşturulurken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToLiveExam(data);
  } catch (error) {
    console.error('createLiveExam error:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Canlı sınavı güncelle
export async function updateLiveExam(
  examId: string, 
  updates: LiveExamUpdateParams
): Promise<LiveExam | { error: string }> {
  try {
    const currentExam = await getLiveExamById(examId);
    if (!currentExam) {
      return { error: 'Güncellenecek canlı sınav bulunamadı.' };
    }
    
    // COMPLETED veya CANCELLED durumundaki sınavlar güncellenemez
    if (currentExam.status === LiveExamStatus.COMPLETED || currentExam.status === LiveExamStatus.CANCELLED) {
      return { error: 'Tamamlanmış veya iptal edilmiş sınavlar güncellenemez.' };
    }
    
    // Durumu ACTIVE olarak değiştiriyorsa, actualStartTime'ı da ayarla
    const updateData: any = {
      ...updates,
      scheduled_start_time: updates.scheduledStartTime?.toISOString(),
      scheduled_end_time: updates.scheduledEndTime?.toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (updates.status === LiveExamStatus.ACTIVE && currentExam.status !== LiveExamStatus.ACTIVE) {
      updateData.actual_start_time = new Date().toISOString();
    }
    
    // Durumu COMPLETED olarak değiştiriyorsa, actualEndTime'ı da ayarla
    if (updates.status === LiveExamStatus.COMPLETED) {
      updateData.actual_end_time = new Date().toISOString();
      
      // Sonuçları otomatik yayınla
      if (currentExam.autoPublishResults) {
        // Burada sonuçları hesaplama ve katılımcı kayıtlarını güncelleme işlemleri yapılabilir
        await calculateAndPublishResults(examId);
      }
    }
    
    // snake_case dönüşümlerini yap
    if (updates.studentIds !== undefined) updateData.student_ids = updates.studentIds;
    if (updates.classIds !== undefined) updateData.class_ids = updates.classIds;
    if (updates.autoPublishResults !== undefined) updateData.auto_publish_results = updates.autoPublishResults;
    if (updates.allowLateSubmissions !== undefined) updateData.allow_late_submissions = updates.allowLateSubmissions;
    if (updates.maxAttempts !== undefined) updateData.max_attempts = updates.maxAttempts;
    if (updates.randomizeQuestions !== undefined) updateData.randomize_questions = updates.randomizeQuestions;
    if (updates.randomizeOptions !== undefined) updateData.randomize_options = updates.randomizeOptions;
    if (updates.timeLimit !== undefined) updateData.time_limit = updates.timeLimit;
    
    const { data, error } = await supabase
      .from(LIVE_EXAMS_TABLE)
      .update(updateData)
      .eq('id', examId)
      .select()
      .single();
      
    if (error) {
      console.error(`Error updating live exam ${examId}:`, error);
      return { error: `Canlı sınav güncellenirken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToLiveExam(data);
  } catch (error) {
    console.error('updateLiveExam error:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Canlı sınavı başlat
export async function startLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.ACTIVE });
}

// Canlı sınavı duraklat
export async function pauseLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.PAUSED });
}

// Canlı sınavı devam ettir
export async function resumeLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.ACTIVE });
}

// Canlı sınavı tamamla
export async function completeLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.COMPLETED });
}

// Canlı sınavı iptal et
export async function cancelLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.CANCELLED });
}

// Canlı sınavı sil
export async function deleteLiveExam(examId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Önce katılımcıları sil
    const { error: participantsError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .delete()
      .eq('exam_id', examId);
      
    if (participantsError) {
      console.error(`Error deleting participants for exam ${examId}:`, participantsError);
      return { success: false, error: `Katılımcı kayıtları silinirken bir hata oluştu: ${participantsError.message}` };
    }
    
    // Sonra sınavı sil
    const { error } = await supabase
      .from(LIVE_EXAMS_TABLE)
      .delete()
      .eq('id', examId);
      
    if (error) {
      console.error(`Error deleting live exam ${examId}:`, error);
      return { success: false, error: `Canlı sınav silinirken bir hata oluştu: ${error.message}` };
    }
    
    return { success: true };
  } catch (error) {
    console.error('deleteLiveExam error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// --- Katılımcı İşlemleri ---

// Öğrenciyi sınava kaydet
export async function registerStudentForExam(
  examId: string, 
  studentId: string
): Promise<LiveExamParticipant | { error: string }> {
  try {
    const exam = await getLiveExamById(examId);
    if (!exam) {
      return { error: 'Canlı sınav bulunamadı.' };
    }
    
    // Sınav durumunu kontrol et
    if (exam.status !== LiveExamStatus.SCHEDULED && exam.status !== LiveExamStatus.ACTIVE) {
      return { error: 'Bu sınava şu anda kayıt yapılamaz.' };
    }
    
    // Öğrencinin bu sınava daha önce kaydolup olmadığını kontrol et
    const { data: existingParticipants, error: queryError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId);
      
    if (queryError) {
      console.error(`Error checking existing participants for exam ${examId}, student ${studentId}:`, queryError);
      return { error: `Katılımcı kontrolü sırasında bir hata oluştu: ${queryError.message}` };
    }
    
    // Öğrencinin kayıt sayısını kontrol et
    if (existingParticipants && existingParticipants.length >= exam.maxAttempts) {
      return { error: `Bu sınav için maksimum deneme sayısına (${exam.maxAttempts}) ulaştınız.` };
    }
    
    // Yeni deneme numarasını belirle
    const attemptNumber = existingParticipants ? existingParticipants.length + 1 : 1;
    
    const newParticipant = {
      exam_id: examId,
      student_id: studentId,
      status: ParticipantStatus.REGISTERED,
      progress: 0,
      attempt_number: attemptNumber
    };
    
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .insert(newParticipant)
      .select()
      .single();
      
    if (error) {
      console.error(`Error registering student ${studentId} for exam ${examId}:`, error);
      return { error: `Sınava kayıt yapılırken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToParticipant(data);
  } catch (error) {
    console.error('registerStudentForExam error:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Öğrencinin sınava başlaması
export async function startExamForStudent(
  examId: string, 
  studentId: string,
  ipAddress?: string,
  deviceInfo?: string
): Promise<LiveExamParticipant | { error: string }> {
  try {
    const exam = await getLiveExamById(examId);
    if (!exam) {
      return { error: 'Canlı sınav bulunamadı.' };
    }
    
    // Sınav aktif mi kontrol et
    if (exam.status !== LiveExamStatus.ACTIVE) {
      return { error: 'Bu sınav şu anda aktif değil.' };
    }
    
    // Öğrencinin kaydını bul
    const { data: participants, error: queryError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false });
      
    if (queryError) {
      console.error(`Error fetching participant for exam ${examId}, student ${studentId}:`, queryError);
      return { error: `Katılımcı bilgisi alınırken bir hata oluştu: ${queryError.message}` };
    }
    
    if (!participants || participants.length === 0) {
      return { error: 'Bu sınava kayıtlı değilsiniz. Lütfen önce kayıt olun.' };
    }
    
    // En son denemeyi al
    const latestAttempt = participants[0];
    
    // Durumu kontrol et
    if (latestAttempt.status !== ParticipantStatus.REGISTERED) {
      return { error: 'Bu sınava zaten başladınız veya tamamladınız.' };
    }
    
    const now = new Date();
    
    const updateData = {
      status: ParticipantStatus.IN_PROGRESS,
      start_time: now.toISOString(),
      last_active_time: now.toISOString(),
      ip_address: ipAddress,
      device_info: deviceInfo
    };
    
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .update(updateData)
      .eq('id', latestAttempt.id)
      .select()
      .single();
      
    if (error) {
      console.error(`Error starting exam for student ${studentId}, exam ${examId}:`, error);
      return { error: `Sınav başlatılırken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToParticipant(data);
  } catch (error) {
    console.error('startExamForStudent error:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Öğrencinin cevaplarını güncelle ve ilerleme durumunu kaydet
export async function updateStudentAnswers(
  examId: string,
  studentId: string,
  answers: Record<string, string>,
  progress: number
): Promise<LiveExamParticipant | { error: string }> {
  try {
    // Öğrencinin kaydını bul
    const { data: participants, error: queryError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('status', ParticipantStatus.IN_PROGRESS)
      .order('attempt_number', { ascending: false });
      
    if (queryError) {
      console.error(`Error fetching participant for exam ${examId}, student ${studentId}:`, queryError);
      return { error: `Katılımcı bilgisi alınırken bir hata oluştu: ${queryError.message}` };
    }
    
    if (!participants || participants.length === 0) {
      return { error: 'Aktif bir sınav oturumu bulunamadı.' };
    }
    
    const participant = participants[0];
    
    const updateData = {
      answers,
      progress,
      last_active_time: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .update(updateData)
      .eq('id', participant.id)
      .select()
      .single();
      
    if (error) {
      console.error(`Error updating answers for student ${studentId}, exam ${examId}:`, error);
      return { error: `Cevaplar güncellenirken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToParticipant(data);
  } catch (error) {
    console.error('updateStudentAnswers error:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Öğrencinin sınavı tamamlaması
export async function submitExamForStudent(
  examId: string,
  studentId: string,
  answers: Record<string, string>
): Promise<LiveExamParticipant | { error: string }> {
  try {
    const exam = await getLiveExamById(examId);
    if (!exam) {
      return { error: 'Canlı sınav bulunamadı.' };
    }
    
    // Öğrencinin kaydını bul
    const { data: participants, error: queryError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('status', ParticipantStatus.IN_PROGRESS)
      .order('attempt_number', { ascending: false });
      
    if (queryError) {
      console.error(`Error fetching participant for exam ${examId}, student ${studentId}:`, queryError);
      return { error: `Katılımcı bilgisi alınırken bir hata oluştu: ${queryError.message}` };
    }
    
    if (!participants || participants.length === 0) {
      return { error: 'Aktif bir sınav oturumu bulunamadı.' };
    }
    
    const participant = participants[0];
    const now = new Date();
    
    // Sınav süresi doldu mu kontrol et
    let status = ParticipantStatus.COMPLETED;
    if (participant.start_time) {
      const startTime = new Date(participant.start_time);
      const timeLimitMs = exam.timeLimit * 60 * 1000;
      const expiryTime = new Date(startTime.getTime() + timeLimitMs);
      
      if (now > expiryTime && !exam.allowLateSubmissions) {
        status = ParticipantStatus.TIMED_OUT;
      }
    }
    
    const updateData: any = {
      status,
      answers,
      progress: 100,
      submit_time: now.toISOString(),
      last_active_time: now.toISOString()
    };
    
    // Eğer sonuçlar hemen yayınlanacaksa hesapla
    if (exam.autoPublishResults || exam.status === LiveExamStatus.COMPLETED) {
      const testData = await getTestById(exam.testId);
      if (testData) {
        const { score, isPassed } = calculateScore(testData, answers);
        updateData.score = score;
        updateData.is_passed = isPassed;
      }
    }
    
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .update(updateData)
      .eq('id', participant.id)
      .select()
      .single();
      
    if (error) {
      console.error(`Error submitting exam for student ${studentId}, exam ${examId}:`, error);
      return { error: `Sınav gönderilirken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToParticipant(data);
  } catch (error) {
    console.error('submitExamForStudent error:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// --- Yardımcı Fonksiyonlar ---

// Cevapları değerlendirip puan hesapla
function calculateScore(test: Test, answers: Record<string, string>): { score: number; isPassed: boolean } {
  const totalQuestions = test.questions.length;
  let correctAnswers = 0;
  
  test.questions.forEach(question => {
    if (answers[question.id] === question.correctOptionId) {
      correctAnswers++;
    }
  });
  
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const passingScore = test.passingScore || 70;
  const isPassed = score >= passingScore;
  
  return { score, isPassed };
}

// Tüm katılımcıların sonuçlarını hesapla ve yayınla
async function calculateAndPublishResults(examId: string): Promise<void> {
  try {
    const exam = await getLiveExamById(examId);
    if (!exam) {
      console.error(`Exam not found: ${examId}`);
      return;
    }
    
    const testData = await getTestById(exam.testId);
    if (!testData) {
      console.error(`Test not found for exam: ${examId}, test: ${exam.testId}`);
      return;
    }
    
    const participants = await getLiveExamParticipants(examId);
    
    // Her katılımcı için sonuçları hesapla
    for (const participant of participants) {
      if (participant.status === ParticipantStatus.COMPLETED || participant.status === ParticipantStatus.TIMED_OUT) {
        if (participant.answers) {
          const { score, isPassed } = calculateScore(testData, participant.answers);
          
          // Sonuçları güncelle
          await supabase
            .from(PARTICIPANTS_TABLE)
            .update({
              score,
              is_passed: isPassed
            })
            .eq('id', participant.id);
        }
      }
    }
  } catch (error) {
    console.error('calculateAndPublishResults error:', error);
  }
} 