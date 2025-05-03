'use server';

import { prepareSchedulerInput } from '@/lib/scheduling/dataPreparation';
import { findBestSchedule, BestSchedulerResult } from '@/lib/scheduling/scheduler';
import { ScheduledEntry, SerializableSchedulerResult, UnassignedLessonInfo } from '@/types/scheduling';

/**
 * Veriyi hazırlar, en iyi çizelgeyi bulmak için algoritmayı N defa çalıştırır ve sonucu döndürür.
 */
export async function runSchedulerAction(numberOfAttempts: number = 10): Promise<SerializableSchedulerResult> {
    console.log(`runSchedulerAction started for ${numberOfAttempts} attempts...`);
    try {
        // 1. Algoritma girdilerini hazırla
        console.log("Preparing scheduler input...");
        const input = await prepareSchedulerInput();
        console.log("Scheduler input prepared.");

        // 2. En iyi çizelgeyi N deneme ile bul
        console.log(`Finding best schedule over ${numberOfAttempts} attempts...`);
        const result: BestSchedulerResult = await findBestSchedule(input, numberOfAttempts);
        console.log(`Best schedule search finished. Success: ${result.success}, Min Variance: ${result.minVariance?.toFixed(4)}`);

        // Serialize the best schedule Map to Array
        let scheduleArray: [string, ScheduledEntry][] | undefined = undefined;
        if (result.bestSchedule && result.bestSchedule.size > 0) {
            scheduleArray = Array.from(result.bestSchedule.entries());
        }

        // Map UnassignedLessons to UnassignedLessonInfo format
        let calculatedTotalUnassignedHours = 0;
        const unassignedInfoArray: UnassignedLessonInfo[] = result.unassignedLessons.map(lesson => {
            const remainingHours = lesson.weeklyHours;
            calculatedTotalUnassignedHours += remainingHours;
            return {
                lessonId: lesson.id,
                lessonName: lesson.name,
                remainingHours: remainingHours,
            };
        });

        // Construct serializable result using data from BestSchedulerResult
        const serializableResult: SerializableSchedulerResult = {
            success: result.success,
            schedule: scheduleArray,
            unassignedLessons: unassignedInfoArray,
            totalUnassignedHours: calculatedTotalUnassignedHours,
            error: result.error,
            logs: result.logs
        };

        console.log(`Returning result. Success: ${serializableResult.success}, Logs: ${serializableResult.logs.length} lines.`);
        return serializableResult;

    } catch (error) {
        console.error("Error in runSchedulerAction:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Bilinmeyen bir çizelgeleme hatası oluştu.",
            logs: [`runSchedulerAction Error: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
} 