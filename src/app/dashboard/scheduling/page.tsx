'use client';

import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query'; // Import useQuery
import { runSchedulerAction } from '@/actions/schedulerActions'; // Import the server action
import { SchedulerResult, Schedule, ScheduledEntry, SerializableSchedulerResult, UnassignedLessonInfo } from '@/types/scheduling';
import { Teacher } from '@/types/teachers'; // Import Teacher type
import { LocationWithLabType } from '@/types/locations'; // Import Location type
// import { DalDersOption } from '@/types/dalDersleri'; // Assuming a type for options
import { fetchTeachers } from '@/actions/teacherActions';
import { fetchLocations } from '@/actions/locationActions';
import { fetchAllDersOptions } from '@/actions/dalDersActions';
import { toast } from 'react-toastify'; // Import toast for notifications
import { DashboardLayout } from '@/layouts/DashboardLayout'; // <<< Import DashboardLayout
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // <<< Textarea importu
import { Copy } from 'lucide-react'; // <<< YENİ: Copy ikonu
// import { ScrollArea } from "@/components/ui/scroll-area"; // <<< YENİ IMPORT
// import { ScheduleTable } from '@/components/scheduling/ScheduleTable'; // <<< Tekrar yorumlandı

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
    const [scheduleData, setScheduleData] = useState<Schedule | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [totalUnassignedHours, setTotalUnassignedHours] = useState<number>(0);
    const [unassignedLessonsList, setUnassignedLessonsList] = useState<UnassignedLessonInfo[]>([]);
    const [filteredErrorLogs, setFilteredErrorLogs] = useState<string[]>([]);

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

    const generateScheduleMutation = useMutation<SerializableSchedulerResult, Error>({
        mutationFn: async () => {
            console.log("Starting schedule generation mutation...");
            setLogs([]);
            setFilteredErrorLogs([]);
            setScheduleData(null);
            setUnassignedLessonsList([]);
            setTotalUnassignedHours(0);
            const result = await runSchedulerAction();
            console.log("Scheduler action finished, result received:", result);
            return result;
        },
        onSuccess: (data) => {
            console.log("Mutation onSuccess, data:", data);
            const allLogs = data.logs || [];
            setLogs(allLogs);

            let deserializedSchedule = null;
            if (data.schedule) {
                deserializedSchedule = deserializeSchedule(data.schedule);
                setScheduleData(deserializedSchedule);
            } else {
                setScheduleData(null);
            }

            if (data.unassignedLessons && data.unassignedLessons.length > 0) {
                setUnassignedLessonsList(data.unassignedLessons);
                setTotalUnassignedHours(data.totalUnassignedHours ?? 0);
                toast.info("Çizelge oluşturuldu ancak bazı dersler/saatler atanamadı.");
                console.warn("Schedule generation partially succeeded: Unassigned lessons exist.", data.unassignedLessons);

                // --- YENİ: Spesifik Hata Loglarını Filtrele -> SADECE DERS ID'Sİ ---
                const targetLessonId = "af315d0b-3d13-4a58-aa7b-f769b1ed431f"; // <<< Ders ID'si ile filtrele
                // const targetDay = "Cuma"; // <<< Kaldırıldı
                // const failureKeywords = ["FAIL", "Cannot assign", "unavailable"]; // <<< Kaldırıldı

                console.log(`Filtering logs for lesson ID: '${targetLessonId}'`);
                const filtered = allLogs.filter(log =>
                    log.includes(targetLessonId)
                    // && log.includes(targetDay) // <<< Kaldırıldı
                    // && failureKeywords.some(keyword => log.includes(keyword)) // <<< Kaldırıldı
                );
                console.log("Filtered Logs Result (Lesson ID):", filtered);
                setFilteredErrorLogs(filtered);

                // <<< YENİ: UI'daki başlığı daha genel yapalım >>>
                 const targetLessonNameForDisplay = unassignedLessonsList.find(l => l.lessonId === targetLessonId)?.lessonName || targetLessonId;
                // --- Filtreleme Sonu ---

            } else {
                setUnassignedLessonsList([]);
                setTotalUnassignedHours(0);
                setFilteredErrorLogs([]);
                if (deserializedSchedule) {
                    toast.success("Çizelge başarıyla oluşturuldu. Tüm dersler atandı!");
                    console.log("Schedule generated successfully with all lessons assigned.");
                } else if (!data.error) {
                    toast.info("Çizelge oluşturuldu ancak atanacak ders bulunamadı.");
                    console.log("Schedule generation returned empty schedule without errors.");
                }
            }

            if (data.error) {
                toast.error(`Çizelge Oluşturma Başarısız: ${data.error}`);
                console.error("Schedule generation failed (reported by action):", data.error);
            }
        },
        onError: (error) => {
            console.error("Mutation onError:", error);
            setLogs(prev => [...prev, `Mutation Error: ${error.message}`]);
            setScheduleData(null);
            setUnassignedLessonsList([]);
            setTotalUnassignedHours(0);
            setFilteredErrorLogs([]);
            toast.error(`Çizelge oluşturulurken bir hata oluştu: ${error.message}`);
        },
    });

    // Combined loading state
    const isLoadingData = isLoadingTeachers || isLoadingLocations || isLoadingLessons;

    const handleGenerateClick = () => {
        generateScheduleMutation.mutate();
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
        scheduleMap: Schedule | null, 
        teachers: Partial<Teacher>[] | undefined,
        lessons: { id: string; dersAdi: string }[] | undefined,
        locations: LocationWithLabType[] | undefined
    ) => {
        if (isLoadingData) return <p>Çizelge verileri yükleniyor...</p>; 
        if (!scheduleMap || scheduleMap.size === 0) return <p>Çizelge oluşturulamadı veya boş.</p>;

        const scheduleArray = Array.from(scheduleMap.entries());

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

    // <<< YENİ: Logları Kopyalama Fonksiyonu >>>
    const handleCopyLogs = async () => {
        if (!navigator.clipboard) {
            toast.error('Panoya kopyalama bu tarayıcıda desteklenmiyor.');
            return;
        }
        if (logs.length === 0) {
            toast.info('Kopyalanacak log bulunmuyor.');
            return;
        }
        try {
            await navigator.clipboard.writeText(logs.join('\n'));
            toast.success('Loglar panoya kopyalandı!');
        } catch (err) {
            toast.error('Loglar kopyalanırken bir hata oluştu.');
            console.error('Failed to copy logs: ', err);
        }
    };
    // <<< YENİ BİTİŞ >>>

    // --- YENİ: State'i render sırasında logla ---
    console.log("FilteredErrorLogs state during render:", filteredErrorLogs);
    // --- Log Sonu ---

    // <<< YENİ: Değişkeni burada tanımla >>>
    const targetLessonIdForFilter = "af315d0b-3d13-4a58-aa7b-f769b1ed431f"; // Ayrı bir sabit kullanabiliriz
    const targetLessonNameForDisplay = 
        unassignedLessonsList.find(l => l.lessonId === targetLessonIdForFilter)?.lessonName || targetLessonIdForFilter;

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

                {/* Toplam Atanamayan Saat Gösterimi */} 
                {(generateScheduleMutation.isSuccess || generateScheduleMutation.isError) && !generateScheduleMutation.isPending && (
                     <div className={`mt-2 text-sm font-medium ${totalUnassignedHours > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        Toplam atanamayan ders saati: {totalUnassignedHours}
                     </div>
                 )}

                {generateScheduleMutation.isPending && <p className="mt-4 text-blue-600">Çizelge oluşturuluyor, lütfen bekleyin...</p>}
                {isLoadingData && <p className="mt-4 text-gray-600">Gerekli veriler yükleniyor...</p>}

                {/* Hata Mesajı (Mutation'dan gelen) */} 
                {generateScheduleMutation.isError && (
                     <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        <strong>Hata:</strong> {generateScheduleMutation.error.message}
                     </div>
                )}
                {/* Başarısız Sonuç Mesajı (Action'dan gelen) */} 
                {generateScheduleMutation.isSuccess && !generateScheduleMutation.data?.success && generateScheduleMutation.data?.error && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                       <strong>Çizelge Oluşturma Başarısız:</strong> {generateScheduleMutation.data.error}
                    </div>
                )}

                 {/* Atanamayan Dersler Listesi */} 
                {generateScheduleMutation.isSuccess && unassignedLessonsList.length > 0 && (
                    <div className="mt-4 p-4 border rounded bg-amber-50 border-amber-200">
                        <h3 className="text-lg font-semibold text-amber-800 mb-2">Atanamayan Dersler ({totalUnassignedHours} saat):</h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
                            {unassignedLessonsList.map((lesson) => (
                            <li key={lesson.lessonId}>
                                <strong>{lesson.lessonName}:</strong> {lesson.remainingHours} saat atanamadı.
                            </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Filtrelenmiş Hata Logları Alanı */} 
                {filteredErrorLogs.length > 0 && (
                    <div className="mt-4 p-4 border rounded bg-red-50 border-red-200">
                        <h4 className="text-md font-semibold text-red-800 mb-2">
                            '{targetLessonNameForDisplay}' dersi için loglar:
                        </h4>
                        <div className="h-40 w-full rounded-md border p-2 bg-white overflow-y-auto">
                             <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
                                {filteredErrorLogs.join('\n')}
                             </pre>
                        </div>
                    </div>
                )}
                {/* Alan Sonu */} 

                {/* Log Alanı --- GEÇİCİ OLARAK YORUM SATIRINA ALINDI --- */}
                
                {/* Başarılı ve dolu çizelge gösterimi -> DEĞİŞTİRİLDİ: scheduleData varsa göster */}
                {scheduleData && (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-3">Oluşturulan Çizelge</h2>
                        {/* Atanamayan ders uyarısı zaten totalUnassignedHours > 0 kontrolü ile gösteriliyor */}
                        {totalUnassignedHours > 0 && (
                            <p className="mb-2 text-orange-600 text-sm">
                                Uyarı: Çizelge oluşturuldu ancak bazı dersler/saatler atanamadı.
                            </p>
                        )}
                         {renderScheduleByTeacher(scheduleData, teachersData, lessonsData, locationsData)}
                    </div>
                )}
                 {/* Başarılı ama boş çizelge durumu -> DEĞİŞTİRİLDİ: Hata YOKSA ve scheduleData YOKSA göster */}
                 {!generateScheduleMutation.isError && generateScheduleMutation.isSuccess && !scheduleData && (
                    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                       Çizelge başarıyla oluşturuldu ancak gösterilecek atama bulunamadı.
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}

// Helper to deserialize the schedule Map
function deserializeSchedule(serialized?: [string, any][]): Schedule | null {
    if (!serialized) return null;
    try {
        // Assuming the structure is [key, ScheduledEntry]
        return new Map<string, any>(serialized);
    } catch (e) {
        console.error("Error deserializing schedule:", e);
        return null;
    }
} 