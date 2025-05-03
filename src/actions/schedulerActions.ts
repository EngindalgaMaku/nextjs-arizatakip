'use server';

import { prepareSchedulerInput } from '@/lib/scheduling/dataPreparation';
import { generateSchedule } from '@/lib/scheduling/scheduler';
import { SchedulerResult, ScheduledEntry, SerializableSchedulerResult, UnassignedLessonInfo } from '@/types/scheduling';

/**
 * Veriyi hazırlar, çizelgeleme algoritmasını çalıştırır ve sonucu döndürür.
 */
export async function runSchedulerAction(): Promise<SerializableSchedulerResult> {
    console.log("runSchedulerAction started...");
    try {
        // 1. Algoritma girdilerini hazırla
        console.log("Preparing scheduler input...");
        const input = await prepareSchedulerInput(); // hoursPerDay varsayılanı (12) kullanılıyor
        console.log("Scheduler input prepared.");

        // 2. Çizelgeyi oluştur
        console.log("Generating schedule...");
        const result = await generateSchedule(input); // generateSchedule zaten Promise döndürüyor
        console.log("Schedule generation finished in action.");

        // Serialize schedule Map to Array
        let scheduleArray: [string, ScheduledEntry][] | undefined = undefined;
        if (result.schedule) {
            scheduleArray = Array.from(result.schedule.entries());
        }

        // --- YENİ: UnassignedLessons'ı UnassignedLessonInfo formatına map et ---
        let unassignedInfoArray: UnassignedLessonInfo[] | undefined = undefined;
        let calculatedTotalUnassignedHours = 0;
        if (result.unassignedLessons && Array.isArray(result.unassignedLessons)) {
            unassignedInfoArray = result.unassignedLessons.map(lesson => {
                // Varsayım: Atanamayan saat sayısı, dersin haftalık saati kadardır.
                // Eğer algoritma kısmi atama yapıp kalan saati döndürüyorsa,
                // `result.unassignedLessons` yapısını veya bu mapping'i güncellemek gerekir.
                const remainingHours = lesson.weeklyHours; 
                calculatedTotalUnassignedHours += remainingHours; // Toplamı hesapla
                return {
                    lessonId: lesson.id,
                    lessonName: lesson.name, // LessonScheduleData'dan ders adını al
                    remainingHours: remainingHours,
                };
            });
        }
        // --- MAP ETME SONU ---

        // Construct serializable result including logs
        const serializableResult: SerializableSchedulerResult = {
            success: result.success,
            schedule: scheduleArray,
            unassignedLessons: unassignedInfoArray, // <<< Mapped array'i kullan
            totalUnassignedHours: calculatedTotalUnassignedHours, // <<< Hesaplanan toplamı ekle
            error: result.error,
            diagnostics: result.diagnostics, // Pass through diagnostics if any
            logs: result.logs // <<< YENİ: logları ekle
        };

        console.log(`Returning result. Success: ${serializableResult.success}, Logs: ${serializableResult.logs?.length ?? 0} lines.`);
        return serializableResult;

    } catch (error) {
        console.error("Error in runSchedulerAction:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Bilinmeyen bir çizelgeleme hatası oluştu.",
            logs: [`runSchedulerAction Error: ${error instanceof Error ? error.message : String(error)}`] // Hata durumunda da log ekleyelim
        };
    }
} 