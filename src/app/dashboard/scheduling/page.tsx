'use client';

import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query'; // Import useQuery
import { runSchedulerAction } from '@/actions/schedulerActions'; // Import the server action
import { SchedulerResult, Schedule, ScheduledEntry, SerializableSchedulerResult } from '@/types/scheduling';
import { Teacher } from '@/types/teachers'; // Import Teacher type
import { LocationWithLabType } from '@/types/locations'; // Import Location type
// import { DalDersOption } from '@/types/dalDersleri'; // Assuming a type for options
import { fetchTeachers } from '@/actions/teacherActions';
import { fetchLocations } from '@/actions/locationActions';
import { fetchAllDersOptions } from '@/actions/dalDersActions';
import { toast } from 'react-toastify'; // Import toast for notifications
import { DashboardLayout } from '@/layouts/DashboardLayout'; // <<< Import DashboardLayout
// import { Button } from '@/components/ui/button'; // Doğru yolu bulunca ekleyeceğiz
// Geçici Button
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} className={`px-4 py-2 border rounded text-sm inline-flex items-center justify-center ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
        {children}
    </button>
);

// Helper type for grouping schedule by teacher
interface TeacherScheduleGroup {
    [teacherName: string]: {
        [day: string]: {
            [hour: number]: ScheduledEntry;
        }
    }
}

// Constants for rendering the grid
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 1); // 1 to 10

// --- YENİ: Renk Üretme ve Kontrast Yardımcıları ---
function stringToHslColor(str: string, s: number, l: number): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Basit parlaklık hesaplaması ve kontrast rengi seçimi
function getContrastColor(hslColor: string): string {
    // HSL değerlerini ayıkla (basit regex, daha sağlamı gerekebilir)
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
        const l = parseInt(match[3], 10);
        // Parlaklık eşiği (deneyerek ayarlanabilir)
        return l > 55 ? '#000000' : '#FFFFFF'; // Parlaksa siyah, koyuysa beyaz metin
    }
    return '#000000'; // Varsayılan siyah
}

// Renkleri memoize etmek için ders ID'sine göre bir map
const lessonColorCache = new Map<string, { background: string; text: string }>();

function getLessonColor(lessonId: string): { background: string; text: string } {
    if (lessonColorCache.has(lessonId)) {
        return lessonColorCache.get(lessonId)!;
    }
    // Pastel tonlar için doygunluğu ve parlaklığı ayarla
    const backgroundColor = stringToHslColor(lessonId, 70, 80); // %70 doygunluk, %80 parlaklık
    const textColor = getContrastColor(backgroundColor);
    const colors = { background: backgroundColor, text: textColor };
    lessonColorCache.set(lessonId, colors);
    return colors;
}
// --- Renk Yardımcıları Sonu ---

export default function SchedulingPage() {
    const [result, setResult] = useState<SerializableSchedulerResult | null>(null);

    // Fetch necessary data for displaying names
    const { data: teachersData, isLoading: isLoadingTeachers } = useQuery<Partial<Teacher>[], Error>({
        queryKey: ['teachers'],
        queryFn: fetchTeachers,
        // Keep data fresh but don't refetch excessively if the view is static
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: locationsData, isLoading: isLoadingLocations } = useQuery<LocationWithLabType[], Error>({
        queryKey: ['locations'],
        queryFn: fetchLocations,
        staleTime: 5 * 60 * 1000,
    });

    // Assuming fetchAllDersOptions returns { id: string; dersAdi: string; ... }[]
    // Let's define a potential type or use a generic one for now
    const { data: lessonsData, isLoading: isLoadingLessons } = useQuery<{ id: string; dersAdi: string }[], Error>({
        queryKey: ['allLessonOptions'],
        queryFn: fetchAllDersOptions as any, // Cast if return type mismatch, adjust later
        staleTime: 5 * 60 * 1000,
    });

    const generateScheduleMutation = useMutation<SerializableSchedulerResult, Error>({ // Tipi belirt
        mutationFn: runSchedulerAction, // Server action'ı çağır
        onSuccess: (data) => {
            console.log("Scheduler Result Received on Client:", data);
            setResult(data);
            if (data.success) {
                toast.success("Çizelge başarıyla oluşturuldu!"); // Use toast
            } else {
                toast.error(`Çizelge oluşturulamadı: ${data.error}`); // Use toast
            }
        },
        onError: (error) => {
            console.error("Scheduler Action Error:", error);
            setResult({ success: false, error: `Çizelge oluşturulurken bir hata oluştu: ${error.message}` });
            toast.error(`Çizelge oluşturulurken bir hata oluştu: ${error.message}`); // Use toast
        },
    });

    // Combined loading state
    const isLoadingData = isLoadingTeachers || isLoadingLocations || isLoadingLessons;

    const handleGenerateClick = () => {
        setResult(null); // Önceki sonucu temizle
        generateScheduleMutation.mutate(); // Server action'ı tetikle
        // alert("Henüz bağlı değil!"); // Kaldırıldı
    };

    // Helper function to create lookup maps for faster name retrieval
    const createLookupMap = <T extends { id: string; name?: string; dersAdi?: string }>(data: T[] | undefined, keyField: 'name' | 'dersAdi' = 'name'): Map<string, string> => {
        const map = new Map<string, string>();
        if (data) {
            data.forEach(item => {
                const name = item[keyField] || item.name; // Handle both 'name' and 'dersAdi'
                if (item.id && name) {
                    map.set(item.id, name);
                }
            });
        }
        return map;
    };

    // Çizelgeyi öğretmen bazlı grid olarak render etme fonksiyonu
    const renderScheduleByTeacher = (
        scheduleArray: [string, ScheduledEntry][] | undefined,
        teachers: Partial<Teacher>[] | undefined,
        lessons: { id: string; dersAdi: string }[] | undefined,
        locations: LocationWithLabType[] | undefined
    ) => {
        if (isLoadingData) return <p>Çizelge verileri yükleniyor...</p>; // Show loading if data isn't ready
        if (!scheduleArray || scheduleArray.length === 0) return <p>Çizelge oluşturulamadı veya boş.</p>;

        // Filter teachers to ensure 'id' is a string before creating the map
        const validTeachers = teachers?.filter((t): t is Teacher & { id: string; name?: string } => 
            typeof t?.id === 'string' && typeof t?.name === 'string'
        );

        // Create lookup maps using potentially filtered/validated data
        const teacherMap = createLookupMap(validTeachers); // Use filtered teachers
        const lessonMap = createLookupMap(lessons, 'dersAdi');
        const locationMap = createLookupMap(locations);

        // 1. Schedule verisini öğretmen ID'sine göre grupla
        const groupedSchedule: { [teacherId: string]: { [day: string]: { [hour: number]: ScheduledEntry } } } = {};
        scheduleArray.forEach(([, entry]) => {
            // Use teacherId for grouping
            const teacherId = entry.teacherId;
            const day = entry.timeSlot.day;
            const hour = entry.timeSlot.hour;

            if (!groupedSchedule[teacherId]) {
                groupedSchedule[teacherId] = {};
            }
            if (!groupedSchedule[teacherId][day]) {
                groupedSchedule[teacherId][day] = {};
            }
            // Store the original entry
            groupedSchedule[teacherId][day][hour] = entry;
        });

        // Ders ID'leri için renkleri önceden hesapla (isteğe bağlı optimizasyon)
        // useMemo(() => {
        //     if (lessons) {
        //         lessons.forEach(lesson => getLessonColor(lesson.id));
        //     }
        // }, [lessons]);

        return (
            <div className="space-y-8">
                {Object.keys(groupedSchedule).sort((a, b) => (teacherMap.get(a) ?? 'Z').localeCompare(teacherMap.get(b) ?? 'Z')).map(teacherId => {
                     const teacherName = teacherMap.get(teacherId) || 'Bilinmeyen Öğretmen';

                    // --- YENİ: Öğretmen Toplam Saatini Hesapla ---
                    let totalTeacherHours = 0;
                    Object.values(groupedSchedule[teacherId]).forEach(daySchedule => {
                        totalTeacherHours += Object.keys(daySchedule).length; // Her entry 1 saat varsayılıyor
                    });
                    // --- Hesaplama Sonu ---

                     return (
                        <div key={teacherId} className="overflow-x-auto shadow border border-gray-200 rounded-lg">
                             {/* --- YENİ: Başlığa Toplam Saati Ekle --- */}
                            <h4 className="text-lg font-semibold p-3 bg-gray-100 border-b">
                                {teacherName}
                                <span className="text-sm font-normal text-gray-600 ml-2">(Toplam: {totalTeacherHours} saat)</span>
                            </h4>
                            <table className="min-w-full divide-y divide-gray-200 border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Saat</th>
                                        {DAYS.map(day => (
                                            <th key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300 w-1/5">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {HOURS.map(hour => (
                                        <tr key={hour}>
                                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-700 border border-gray-300 w-16 text-center">{`${hour}. Saat`}</td>
                                            {DAYS.map(day => {
                                                const entry = groupedSchedule[teacherId]?.[day]?.[hour];
                                                const lessonName = entry ? lessonMap.get(entry.lessonId) || 'Bilinmeyen Ders' : '';
                                                const locationName = entry ? locationMap.get(entry.locationId) || 'Bilinmeyen Konum' : '';

                                                const cellStyle = entry
                                                    ? getLessonColor(entry.lessonId)
                                                    : { background: 'transparent', text: '#a0aec0' };

                                                return (
                                                    <td
                                                        key={`${day}-${hour}`}
                                                        className="px-2 py-1 border border-gray-300 text-center align-top h-16"
                                                        style={{ backgroundColor: cellStyle.background, color: cellStyle.text }}
                                                    >
                                                        {entry ? (
                                                            <div className="text-xs">
                                                                <p className="font-semibold">{lessonName}</p>
                                                                <p style={{ color: cellStyle.text === '#FFFFFF' ? '#E2E8F0' : '#4A5568' }}>
                                                                    {locationName}
                                                                </p>
                                                                {/* --- YENİ: Sınıf Seviyesini Ekle --- */}
                                                                <p className="text-[10px] mt-0.5" style={{ color: cellStyle.text === '#FFFFFF' ? '#CBD5E0' : '#718096' }}> {/* Biraz daha soluk */}
                                                                    Sınıf: {entry.sinifSeviyesi}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400"></span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6">
                <h1 className="text-2xl font-semibold text-gray-800 mb-4">Otomatik Çizelge Oluşturma</h1>

                <Button
                    onClick={handleGenerateClick}
                    disabled={generateScheduleMutation.isPending || isLoadingData}
                >
                    {generateScheduleMutation.isPending ? 'Oluşturuluyor...' : 
                     isLoadingData ? 'Veri Yükleniyor...' : 'Çizelge Oluştur'} 
                </Button>

                {generateScheduleMutation.isPending && <p className="mt-4 text-blue-600">Çizelge oluşturuluyor, lütfen bekleyin...</p>}
                {isLoadingData && <p className="mt-4 text-gray-600">Gerekli veriler yükleniyor...</p>}

                {result && !result.success && result.error && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        <strong>Hata:</strong> {result.error}
                    </div>
                )}

                {result?.logs && result.logs.length > 0 && (
                    <div className="mt-6 p-4 border rounded bg-gray-50">
                        <h3 className="text-md font-semibold mb-2 text-gray-700">Algoritma Logları:</h3>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto max-h-60 bg-white p-2 rounded border">
                            {result.logs.join('\n')} 
                        </pre>
                    </div>
                )}

                {result?.schedule && result.schedule.length > 0 && ( 
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-3">Oluşturulan Çizelge</h2>
                        {result && !result.success && (
                            <p className="mb-2 text-orange-600 text-sm">
                                Uyarı: Çizelge tam olarak oluşturulamadı, bazı dersler/saatler atanamamış olabilir. Detaylar için hata mesajına bakın.
                            </p>
                        )}
                        {renderScheduleByTeacher(result.schedule, teachersData, lessonsData, locationsData)}
                    </div>
                )}

                 {result && (!result.schedule || result.schedule.length === 0) && ( 
                    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                       {result.success 
                           ? "Çizelge başarıyla oluşturuldu ancak gösterilecek atama bulunamadı." 
                           : "Çizelge oluşturulamadı veya oluşturulan çizelge boş."} 
                       {!result.success && !result.error && " Çizelge oluşturulurken bir sorun oluştu."}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
} 