'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { runSchedulerAction } from '@/actions/schedulerActions';
import { saveScheduleAction } from '@/actions/savedScheduleActions';
import { SchedulerResult, Schedule, ScheduledEntry, SerializableSchedulerResult, UnassignedLessonInfo, BestSchedulerResult } from '@/types/scheduling';
import { Teacher } from '@/types/teachers';
import { LocationWithLabType } from '@/types/locations';
import { fetchTeachers } from '@/actions/teacherActions';
import { fetchLocations } from '@/actions/locationActions';
import { fetchAllDersOptions } from '@/actions/dalDersActions';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ScheduleGridDisplay } from '@/components/scheduling/ScheduleGridDisplay';

export default function SchedulingPage() {
    const [scheduleData, setScheduleData] = useState<Schedule | null>(null);
    const [unassignedLessonsDisplay, setUnassignedLessonsDisplay] = useState<UnassignedLessonInfo[]>([]);
    const [totalUnassignedHoursDisplay, setTotalUnassignedHoursDisplay] = useState<number>(0);
    const [numAttempts, setNumAttempts] = useState<number>(50);
    const [lastGeneratedResult, setLastGeneratedResult] = useState<BestSchedulerResult | null>(null);

    const { data: teachersData, isLoading: isLoadingTeachers } = useQuery<Partial<Teacher>[], Error>({
        queryKey: ['teachers'],
        queryFn: fetchTeachers,
        staleTime: 5 * 60 * 1000,
    });

    const { data: locationsData, isLoading: isLoadingLocations } = useQuery<LocationWithLabType[], Error>({
        queryKey: ['locations'],
        queryFn: fetchLocations,
        staleTime: 5 * 60 * 1000,
    });

    const { data: lessonsData, isLoading: isLoadingLessons } = useQuery<{ id: string; dersAdi?: string }[], Error>({
        queryKey: ['allLessonOptions'],
        queryFn: fetchAllDersOptions as any,
        staleTime: 5 * 60 * 1000,
    });

    const generateScheduleMutation = useMutation<BestSchedulerResult, Error>({
        mutationFn: async () => {
            setScheduleData(null);
            setUnassignedLessonsDisplay([]);
            setTotalUnassignedHoursDisplay(0);
            setLastGeneratedResult(null);
            const result = await runSchedulerAction(numAttempts);
            return result;
        },
        onSuccess: (data) => {
            setLastGeneratedResult(data);
            setScheduleData(data.bestSchedule ?? null);
            let calculatedTotalUnassignedHours = 0;
            const unassignedInfoArray: UnassignedLessonInfo[] = (data.unassignedLessons || []).map(lesson => {
                const remainingHours = lesson.weeklyHours;
                calculatedTotalUnassignedHours += remainingHours;
                return { lessonId: lesson.id, lessonName: lesson.name, remainingHours: remainingHours };
            });
            setUnassignedLessonsDisplay(unassignedInfoArray);
            setTotalUnassignedHoursDisplay(calculatedTotalUnassignedHours);
            if (!data.success && data.error) { toast.error(`Çizelge Oluşturma Başarısız: ${data.error}`); }
            else if (data.success && unassignedInfoArray.length > 0) { toast.info("Çizelge oluşturuldu ancak bazı dersler atanamadı."); }
            else if (data.success && data.bestSchedule?.size > 0) { toast.success("Çizelge başarıyla oluşturuldu. Tüm dersler atandı!"); }
            else if (data.success) { toast.info("Çizelge oluşturuldu ancak atanacak ders bulunamadı veya program boş."); }
        },
        onError: (error) => {
            setScheduleData(null);
            setUnassignedLessonsDisplay([]);
            setTotalUnassignedHoursDisplay(0);
            setLastGeneratedResult(null);
            toast.error(`Çizelge oluşturulurken bir hata oluştu: ${error.message}`);
        },
    });

    const saveScheduleMutation = useMutation<void, Error, { name?: string, description?: string }>({
        mutationFn: async (variables) => {
            if (!lastGeneratedResult || !lastGeneratedResult.success || !lastGeneratedResult.bestSchedule) {
                throw new Error("Kaydedilecek geçerli ve başarılı bir çizelge bulunamadı.");
            }
            const scheduleToSave = Array.from(lastGeneratedResult.bestSchedule.entries());
            const unassignedToSave = lastGeneratedResult.unassignedLessons || [];
            await saveScheduleAction({
                schedule_data: scheduleToSave,
                unassigned_lessons: unassignedToSave,
                fitnessScore: lastGeneratedResult.minFitnessScore,
                workloadVariance: lastGeneratedResult.bestVariance,
                totalGaps: lastGeneratedResult.bestTotalGaps,
                logs: lastGeneratedResult.logs,
                name: variables.name,
                description: variables.description,
            });
        },
        onSuccess: () => {
            toast.success("Çizelge başarıyla kaydedildi!");
        },
        onError: (error) => {
            toast.error(`Çizelge kaydedilirken hata oluştu: ${error.message}`);
        },
    });

    const isLoadingData = isLoadingTeachers || isLoadingLocations || isLoadingLessons;
    const isGenerating = generateScheduleMutation.isPending;
    const isSaving = saveScheduleMutation.isPending;
    const canSave = !!lastGeneratedResult && lastGeneratedResult.success;

    const handleGenerateClick = () => {
        if (numAttempts < 1 || !Number.isInteger(numAttempts)) {
            toast.error("Lütfen geçerli bir pozitif deneme sayısı girin.");
            return;
        }
        generateScheduleMutation.mutate();
    };

    const handleSaveClick = () => {
        const name = prompt("Kaydedilecek Çizelge Adı (isteğe bağlı):", `Çizelge ${new Date().toLocaleDateString()}`);
        if (name === null) {
            toast.info("Kaydetme iptal edildi.");
            return;
        }
        saveScheduleMutation.mutate({ name: name || undefined, description: undefined });
    };

    const createLookupMap = <T extends { id: string; name?: string; dersAdi?: string }>(data: T[] | undefined, keyField: 'name' | 'dersAdi' = 'name'): Map<string, string> => {
        const map = new Map<string, string>();
        if (data) {
            data.forEach(item => {
                const name = item[keyField] || item.name;
                if (item.id && name) {
                    map.set(item.id, name);
                }
            });
        }
        return map;
    };

    const teacherMap = useMemo(() => createLookupMap(teachersData as any[]), [teachersData]);
    const lessonMap = useMemo(() => createLookupMap(lessonsData, 'dersAdi'), [lessonsData]);
    const locationMap = useMemo(() => createLookupMap(locationsData as any[]), [locationsData]);

    return (
        <DashboardLayout>
            <div className="space-y-6 p-4 md:p-6">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-white shadow rounded-lg">
                    <div className="flex items-center gap-2">
                        <label htmlFor="numAttempts" className="text-sm font-medium text-gray-700 whitespace-nowrap">Deneme Sayısı:</label>
                        <input type="number" id="numAttempts" min="1" max="500" value={numAttempts} onChange={(e) => { const val = parseInt(e.target.value, 10); setNumAttempts(isNaN(val) || val < 1 ? 1 : Math.min(500, val)); }} disabled={isGenerating || isSaving} className="w-20 rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button onClick={handleGenerateClick} disabled={isGenerating || isLoadingData || isSaving}>{isGenerating ? 'Oluşturuluyor...' : 'Çizelge Oluştur'}</Button>
                        <Button onClick={handleSaveClick} disabled={!canSave || isGenerating || isSaving} variant="secondary">{isSaving ? 'Kaydediliyor...' : 'Çizelgeyi Kaydet'}</Button>
                        <Link href="/dashboard/saved-schedules" passHref><Button variant="outline" disabled={isGenerating || isLoadingData || isSaving}>Kaydedilenler</Button></Link>
                    </div>
                </div>

                {isGenerating && <p className="mt-4 text-blue-600">Çizelge oluşturuluyor, lütfen bekleyin... ({numAttempts} deneme)</p>}
                {isLoadingData && <p className="mt-4 text-gray-600">Gerekli veriler yükleniyor...</p>}
                {generateScheduleMutation.isError && (<div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded"><strong>Hata:</strong> {generateScheduleMutation.error.message}</div>)}
                {lastGeneratedResult && !lastGeneratedResult.success && lastGeneratedResult.error && (<div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded"><strong>Çizelge Oluşturma Başarısız:</strong> {lastGeneratedResult.error}</div>)}
                {!isGenerating && lastGeneratedResult && (<div className={`mt-2 text-sm font-medium ${totalUnassignedHoursDisplay > 0 ? 'text-orange-600' : 'text-green-600'}`}>Toplam atanamayan ders saati: {totalUnassignedHoursDisplay}</div>)}

                {lastGeneratedResult && unassignedLessonsDisplay.length > 0 && (<div className="mt-4 p-4 border rounded bg-amber-50 border-amber-200"><h3 className="text-lg font-semibold text-amber-800 mb-2">Atanamayan Dersler ({totalUnassignedHoursDisplay} saat):</h3><ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">{unassignedLessonsDisplay.map((lesson) => (<li key={lesson.lessonId}><strong>{lesson.lessonName}:</strong> {lesson.remainingHours} saat atanamadı.</li>))}</ul></div>)}

                {scheduleData && scheduleData.size > 0 && (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-3">Oluşturulan Çizelge</h2>
                        <ScheduleGridDisplay 
                            scheduleMap={scheduleData} 
                            teacherMap={teacherMap} 
                            lessonMap={lessonMap} 
                            locationMap={locationMap} 
                        />
                    </div>
                )}
                {lastGeneratedResult && lastGeneratedResult.success && (!scheduleData || scheduleData.size === 0) && unassignedLessonsDisplay.length === 0 && (
                    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                       Çizelge başarıyla oluşturuldu ancak gösterilecek atama bulunamadı (Muhtemelen atanacak ders yoktu).
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
} 