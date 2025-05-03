'use server';

import { prepareSchedulerInput } from '@/lib/scheduling/dataPreparation';
import { generateSchedule } from '@/lib/scheduling/scheduler';
import { SchedulerResult, ScheduledEntry, SerializableSchedulerResult } from '@/types/scheduling';

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

        // Construct serializable result including logs
        const serializableResult: SerializableSchedulerResult = {
            success: result.success,
            schedule: scheduleArray,
            unassignedLessons: result.unassignedLessons,
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