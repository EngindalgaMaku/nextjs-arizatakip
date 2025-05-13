'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Select, { MultiValue } from 'react-select';
import { toast } from 'react-toastify';
import { useSemesterStore } from '@/stores/useSemesterStore';
import { fetchBranches } from '@/actions/branchActions';
import { fetchDallarByBranch } from '@/actions/dalActions';
import { fetchTeachers } from '@/actions/teacherActions';
import { fetchDalDersleri } from '@/actions/dalDersActions';
import { fetchTeacherUnavailability } from '@/actions/teacherUnavailabilityActions';
import { fetchLocations } from '@/actions/locationActions';
import { fetchSemesters } from '@/actions/semesterActions';
import { fetchTeacherAssignments } from '@/actions/teacherAssignmentActions';
import { Teacher } from '@/types/teachers';
import { Branch } from '@/types/branches';
import { Dal } from '@/types/dallar';
import { DalDers } from '@/types/dalDersleri';
import { TeacherUnavailability } from '@/types/teacherUnavailability';
import { LocationWithLabType } from '@/types/locations';
import { Semester } from '@/types/semesters';
import { TeacherCourseAssignment } from '@/types/teacherCourseAssignments';
import { AcademicCapIcon, BookOpenIcon, MapPinIcon, ClipboardDocumentCheckIcon, IdentificationIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from "@/components/ui/button";
import "./scheduling.css"; // Add this CSS import

// Option type for react-select
interface SelectOptionType {
    value: string;
    label: string;
}

// Helper to map day numbers to names
const dayNumberMap: { [key: number]: string } = {
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi', // Assuming 6 and 7 might be possible if data allows
    7: 'Pazar'
};

// Define the structure for the data to be sent to the scheduler API
interface SchedulerInputData {
    semesterId: string | null;
    branchId: string | null;
    dalIds: string[];
    teacherIds: string[];
    locationIds: string[]; // IDs of locations chosen by the user to be considered
    lessonsToSchedule: DalDers[]; 
    teacherUnavailabilities: TeacherUnavailability[];
    // Raw fetched compulsory assignments for the selected teachers
    rawCompulsoryAssignments: { teacherId: string; teacherName: string; assignments: TeacherCourseAssignment[] }[]; 
    // All locations available for the semester (the backend might filter or use all)
    allAvailableLocationsForSemester: LocationWithLabType[]; 
    // Add other relevant full data if needed by the backend, e.g., details of selected Dallar, Teachers
    // selectedDallarDetails: Dal[];
    // selectedTeachersDetails: Teacher[];
    grade12DaysByDal: {[dalId: string]: number[]}; // Update to dal-specific days
}

// Conceptual result type from the scheduler
interface SchedulerRunResult {
    success: boolean;
    message?: string; 
    timetableId?: string; 
    errors?: Array<{ errorType?: string; details: string }>; 
}

// Add type definitions for the timetable
interface TimeSlot {
    day: number;
    period: number;
    teacherId: string;
    teacherName: string;
    lessonId: string;
    lessonName: string;
    locationId: string;
    locationName: string;
    dalId: string;
    dalName: string;
    sinifSeviyesi?: number;
    // Fields for second teacher and location for multi-resource lessons
    secondTeacherId?: string;
    secondTeacherName?: string;
    secondLocationId?: string;
    secondLocationName?: string;
    isMultiResource?: boolean;
    // Add fields for split lessons
    isSplit?: boolean;
    splitGroup?: number; // 1 for first part, 2 for second part
    totalHours?: number; // Total hours of the original lesson
    splitHours?: number; // Hours in this specific part
    color?: string; // Add consistent color
    isConsecutive?: boolean; // Add consecutive flag
    totalConsecutiveHours?: number; // Total consecutive hours
}

interface DailySchedule {
    [period: string]: TimeSlot | null;
}

interface WeeklySchedule {
    [day: string]: DailySchedule;
}

interface TimeTable {
    teacherSchedules: { [teacherId: string]: WeeklySchedule };
    locationSchedules: { [locationId: string]: WeeklySchedule };
    unassignedLessons: DalDers[];
    excludedLessons: DalDers[];
    teacherTotalHours?: { [teacherId: string]: number }; // Changed from Map to object
}

// Add a helper function to generate a unique color based on lesson ID
function getLessonColor(lessonId: string): string {
    // Convert lessonId to a numeric hash
    let hash = 0;
    for (let i = 0; i < lessonId.length; i++) {
        hash = lessonId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate pastel colors (lighter shades)
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 85%)`;
}

export default function SmartTimetablePage() {
    const queryClient = useQueryClient(); // For potential cache invalidation after scheduling
    const { selectedSemesterId } = useSemesterStore();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [selectedDalIds, setSelectedDalIds] = useState<string[]>([]);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    
    // Replace single grade12Days state with mapping
    const [grade12DaysByDal, setGrade12DaysByDal] = useState<{[dalId: string]: number[]}>({});
    
    // Add state for storing generated timetable
    const [generatedTimetable, setGeneratedTimetable] = useState<any>(null);
    const [showTimetable, setShowTimetable] = useState(false);

    // Fetch all Semesters to get the name of the selected one
    const { data: allSemesters = [], isLoading: isLoadingAllSemesters } = useQuery<Semester[], Error>({
        queryKey: ['semestersForSelect'],
        queryFn: fetchSemesters,
        staleTime: 1000 * 60 * 5,
    });

    const selectedSemesterName = useMemo(() => {
        if (selectedSemesterId && allSemesters.length > 0) {
            const foundSemester = allSemesters.find(s => s.id === selectedSemesterId);
            return foundSemester?.name || selectedSemesterId;
        }
        return selectedSemesterId || 'Yok';
    }, [selectedSemesterId, allSemesters]);

    // Fetch Branches
    const { data: branches = [], isLoading: isLoadingBranches, error: errorBranches } = useQuery<Branch[], Error>({
        queryKey: ['allBranchesForScheduler', selectedSemesterId],
        queryFn: () => {
            if (!selectedSemesterId) return Promise.resolve([]);
            return fetchBranches();
        },
        enabled: !!selectedSemesterId,
    });

    // Fetch Dallar based on selectedBranchId
    const { data: dallar = [], isLoading: isLoadingDallar, error: errorDallar } = useQuery<Dal[], Error>({
        queryKey: ['dallarForSchedulerBranch', selectedBranchId],
        queryFn: () => {
            if (!selectedBranchId) return Promise.resolve([]);
            return fetchDallarByBranch(selectedBranchId);
        },
        enabled: !!selectedBranchId,
    });

    // Fetch Teachers for the selected semester
    const { data: semesterTeachers = [], isLoading: isLoadingSemesterTeachers, error: errorSemesterTeachers } = useQuery<Teacher[], Error>({
        queryKey: ['teachersForSchedulerSemester', selectedSemesterId],
        queryFn: () => {
            if (!selectedSemesterId) return Promise.resolve([]);
            return fetchTeachers(selectedSemesterId);
        },
        enabled: !!selectedSemesterId,
    });

    // Fetch Dal Dersleri (lessons) based on selectedDalIds
    const { data: dalLessons = [], isLoading: isLoadingDalLessons, error: errorDalLessons } = useQuery<DalDers[], Error>({
        queryKey: ['dalLessonsForScheduler', selectedDalIds],
        queryFn: async () => {
            if (!selectedDalIds || selectedDalIds.length === 0) return Promise.resolve([]);
            const lessonsPromises = selectedDalIds.map(dalId => fetchDalDersleri(dalId));
            const lessonsArrays = await Promise.all(lessonsPromises);
            return lessonsArrays.flat();
        },
        enabled: selectedDalIds.length > 0,
    });

    // Fetch Teacher Unavailability
    const { data: teacherUnavailability = [], isLoading: isLoadingTeacherUnavailability, error: errorTeacherUnavailability } = useQuery<TeacherUnavailability[], Error>({
        queryKey: ['teacherUnavailabilityForScheduler', selectedTeacherIds],
        queryFn: async () => {
            if (!selectedTeacherIds || selectedTeacherIds.length === 0) return Promise.resolve([]);
            const unavailabilityPromises = selectedTeacherIds.map(teacherId => fetchTeacherUnavailability(teacherId));
            const unavailabilityArrays = await Promise.all(unavailabilityPromises);
            return unavailabilityArrays.flat();
        },
        enabled: selectedTeacherIds.length > 0,
    });

    // Fetch Locations
    const { data: locations = [], isLoading: isLoadingLocations, error: errorLocations } = useQuery<LocationWithLabType[], Error>({
        queryKey: ['locationsForScheduler', selectedSemesterId],
        queryFn: () => fetchLocations(selectedSemesterId || undefined),
        enabled: !!selectedSemesterId,
    });

    // Fetch Compulsory Assignments for each selected teacher
    const { 
        data: allCompulsoryAssignmentsData = [], 
        isLoading: isLoadingCompulsoryAssignments, 
        error: errorCompulsoryAssignments 
    } = useQuery<
        { teacherId: string; teacherName: string; assignments: TeacherCourseAssignment[] }[], 
        Error
    > ({
        queryKey: ['teacherCompulsoryAssignmentsForScheduler', selectedTeacherIds, semesterTeachers], // Added ForScheduler to key
        queryFn: async () => {
            if (!selectedTeacherIds || selectedTeacherIds.length === 0 || semesterTeachers.length === 0) {
                return Promise.resolve([]);
            }
            const assignmentsPromises = selectedTeacherIds.map(async (teacherId) => {
                const teacher = semesterTeachers.find(t => t.id === teacherId);
                const assignments = await fetchTeacherAssignments(teacherId); // Using the actual action
                return { 
                    teacherId, 
                    teacherName: teacher?.name || `Öğretmen ID ${teacherId}`, 
                    assignments // These are TeacherCourseAssignment[]
                };
            });
            return Promise.all(assignmentsPromises);
        },
        enabled: selectedTeacherIds.length > 0 && semesterTeachers.length > 0 && !isLoadingSemesterTeachers,
        staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    });

    // Create a map of DalDers details for easy lookup, if needed for assignment names
    const dalDersMapForAssignments = useMemo(() => {
        const map = new Map<string, { dersAdi: string; sinifSeviyesi?: number; dalId?: string }>();
        dalLessons.forEach(ders => {
            if (ders.id) {
                map.set(ders.id, { 
                    dersAdi: ders.dersAdi, 
                    sinifSeviyesi: ders.sinifSeviyesi,
                    dalId: ders.dalId // Ensure dalId is stored
                });
            }
        });
        return map;
    }, [dalLessons]);

    // Client-side filtered teachers based on selectedBranchId
    const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);

    useEffect(() => {
        if (selectedBranchId && semesterTeachers.length > 0) {
            setFilteredTeachers(semesterTeachers.filter(teacher => teacher.branchId === selectedBranchId));
        } else {
            setFilteredTeachers([]);
        }
    }, [selectedBranchId, semesterTeachers]);

    // Transform data for react-select
    const dalOptions: SelectOptionType[] = useMemo(() => 
        dallar.map(dal => ({ value: dal.id!, label: dal.name! }))
    , [dallar]);

    const teacherOptions: SelectOptionType[] = useMemo(() => 
        filteredTeachers.map(teacher => ({ value: teacher.id!, label: teacher.name || 'İsimsiz Öğretmen' }))
    , [filteredTeachers]);

    const locationOptions: SelectOptionType[] = useMemo(() => 
        locations.map(loc => ({ 
            value: loc.id!, 
            label: `${loc.name}${loc.lab_type ? ` (${loc.lab_type.name})` : ''}${loc.is_suitable_for_theory ? ' [Teori]' : ''}${loc.is_suitable_for_practice ? ' [Uygulama]' : ''}`
        }))
    , [locations]);

    // Add this code after the locationOptions definition
    // Helper function to get dal name by ID
    const getDalNameById = useCallback((dalId: string) => {
        const dal = dallar.find(d => d.id === dalId);
        return dal?.name || 'Bilinmeyen Dal';
    }, [dallar]);

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedBranchId(value === '' ? null : value);
        setSelectedDalIds([]);
        setSelectedTeacherIds([]);
        // Potentially reset location selections if they are branch-dependent, though not explicitly stated yet
        // setSelectedLocationIds([]); 
    };

    const handleDalChange = (selectedOptions: MultiValue<SelectOptionType>) => {
        setSelectedDalIds(selectedOptions ? selectedOptions.map(opt => opt.value) : []);
    };

    const handleTeacherChange = (selectedOptions: MultiValue<SelectOptionType>) => {
        setSelectedTeacherIds(selectedOptions ? selectedOptions.map(opt => opt.value) : []);
    };

    const handleLocationChange = (selectedOptions: MultiValue<SelectOptionType>) => {
        setSelectedLocationIds(selectedOptions ? selectedOptions.map(opt => opt.value) : []);
    };
    
    const canStartDistribution = 
        selectedSemesterId && 
        selectedBranchId && 
        selectedDalIds.length > 0 && 
        selectedTeacherIds.length > 0 && 
        selectedLocationIds.length > 0 && // Added condition for locations
        dalLessons.length > 0;

    // Group lessons by Dal for improved display
    const lessonsGroupedByDal = useMemo(() => {
        if (selectedDalIds.length === 0 || dalLessons.length === 0 || dallar.length === 0) {
            return [];
        }
        return selectedDalIds.map(dalId => {
            const dalInfo = dallar.find(d => d.id === dalId);
            const lessonsForThisDal = dalLessons.filter(lesson => lesson.dalId === dalId);
            return {
                dalId: dalId,
                dalName: dalInfo?.name || 'Bilinmeyen Dal', 
                lessons: lessonsForThisDal,
            };
        }).filter(group => group.lessons.length > 0); 
    }, [selectedDalIds, dalLessons, dallar]);

    // Derived names for summary display
    const selectedBranchName = useMemo(() => 
        branches.find(b => b.id === selectedBranchId)?.name || 'Seçilmedi'
    , [selectedBranchId, branches]);

    const selectedDalNames = useMemo(() => 
        selectedDalIds.map(id => dallar.find(d => d.id === id)?.name || 'Bilinmeyen Dal').join(', ') || 'Seçilmedi'
    , [selectedDalIds, dallar]);

    const selectedTeacherNames = useMemo(() => 
        selectedTeacherIds.map(id => semesterTeachers.find(t => t.id === id)?.name || 'Bilinmeyen Öğretmen').join(', ') || 'Seçilmedi'
    , [selectedTeacherIds, semesterTeachers]);

    const selectedLocationNames = useMemo(() => 
        selectedLocationIds.map(id => locations.find(l => l.id === id)?.name || 'Bilinmeyen Lokasyon').join(', ') || 'Seçilmedi'
    , [selectedLocationIds, locations]);

    // Compulsory lesson assignments for selected teachers
    const compulsoryAssignmentsForDisplay = useMemo(() => {
        if (isLoadingCompulsoryAssignments || allCompulsoryAssignmentsData.length === 0) {
            return new Map<string, { lessonName: string; lessonId: string | number; dalName?: string; sinifSeviyesi?: number }[]>();
        }
        const grouped = new Map<string, { lessonName: string; lessonId: string | number; dalName?: string; sinifSeviyesi?: number }[]>();
        allCompulsoryAssignmentsData.forEach(data => {
            if (data.assignments && data.assignments.length > 0) {
                const lessonsForTeacher = data.assignments.map(a => {
                    let lessonName = 'Bilinmeyen Ders';
                    let sinifSeviyesi: number | undefined = undefined;
                    let dalId: string | undefined = undefined;

                    if (a.dal_ders) { // Prefer direct nested object
                        lessonName = a.dal_ders.dersAdi || lessonName;
                        sinifSeviyesi = a.dal_ders.sinifSeviyesi;
                        dalId = a.dal_ders.dalId;
                    } else if (a.dal_ders_id && dalDersMapForAssignments.has(a.dal_ders_id)) {
                        const mappedDers = dalDersMapForAssignments.get(a.dal_ders_id)!;
                        lessonName = mappedDers.dersAdi || lessonName;
                        sinifSeviyesi = mappedDers.sinifSeviyesi;
                        dalId = mappedDers.dalId;
                    }
                    
                    const dalName = dalId ? (dallar.find(d => d.id === dalId)?.name) : undefined;
                    
                    return { 
                        lessonName, 
                        lessonId: a.id, 
                        dalName: dalName || 'Dal Yok', // Provide a fallback for dalName
                        sinifSeviyesi
                    };
                });
                grouped.set(data.teacherName, lessonsForTeacher);
            }
        });
        return grouped;
    }, [allCompulsoryAssignmentsData, isLoadingCompulsoryAssignments, dalDersMapForAssignments, dallar]);

    // Memoized scheduler input data
    const schedulerInputData = useMemo((): SchedulerInputData | null => {
        if (!canStartDistribution) return null; // Or handle this case as needed

        // Filter allCompulsoryAssignmentsData to only include assignments for *selected* teachers,
        // as allCompulsoryAssignmentsData might contain data for teachers who were deselected
        // after the query ran but before this memo recalculates (if dependencies are set broadly).
        // However, given queryKey includes selectedTeacherIds, this might be redundant but safe.
        const relevantCompulsoryAssignments = allCompulsoryAssignmentsData.filter(data => 
            selectedTeacherIds.includes(data.teacherId)
        );

        return {
            semesterId: selectedSemesterId,
            branchId: selectedBranchId,
            dalIds: selectedDalIds,
            teacherIds: selectedTeacherIds,
            locationIds: selectedLocationIds,
            lessonsToSchedule: dalLessons, // These are already filtered by selectedDalIds
            teacherUnavailabilities: teacherUnavailability, // Already filtered by selectedTeacherIds
            rawCompulsoryAssignments: relevantCompulsoryAssignments, 
            allAvailableLocationsForSemester: locations, // All locations for the semester
            grade12DaysByDal: grade12DaysByDal // Add the 12th grade days
        };
    }, [
        canStartDistribution,
        selectedSemesterId, 
        selectedBranchId, 
        selectedDalIds, 
        selectedTeacherIds, 
        selectedLocationIds,
        dalLessons,
        teacherUnavailability,
        allCompulsoryAssignmentsData,
        locations,
        grade12DaysByDal // Add dependency
    ]);

    // Replace the mock mutation with actual algorithm implementation
    const runSchedulerMutation = useMutation({
        mutationFn: async (data: SchedulerInputData): Promise<{ success: boolean; message?: string; timetable?: TimeTable }> => {
            console.log("Running scheduler with data:", data);
            
            // Create a new timetable structure
            const timetable: TimeTable = {
                teacherSchedules: {},
                locationSchedules: {},
                unassignedLessons: [],
                excludedLessons: []
            };
            
            // Initialize schedules
            data.teacherIds.forEach(teacherId => {
                const teacherName = semesterTeachers.find(t => t.id === teacherId)?.name || `Öğretmen ${teacherId}`;
                timetable.teacherSchedules[teacherId] = initializeWeeklySchedule(teacherName);
            });
            
            data.locationIds.forEach(locationId => {
                const locationName = locations.find(l => l.id === locationId)?.name || `Sınıf ${locationId}`;
                timetable.locationSchedules[locationId] = initializeWeeklySchedule(locationName);
            });
            
            // Get existing assignments
            const existingAssignments = new Map<string, { teacherId: string; lessonId: string }[]>();
            data.rawCompulsoryAssignments.forEach(assignment => {
                if (assignment.assignments.length > 0) {
                    existingAssignments.set(assignment.teacherId, assignment.assignments.map(a => ({
                        teacherId: assignment.teacherId,
                        lessonId: a.dal_ders_id || ""
                    })));
                }
            });
            
            // Process lessons to be scheduled
            const lessonsToSchedule = [...data.lessonsToSchedule].filter(lesson => lesson.cizelgeye_dahil_et !== false);
            // Track lessons explicitly excluded from auto-scheduling
            const excludedLessons = data.lessonsToSchedule.filter(lesson => lesson.cizelgeye_dahil_et === false);
            
            // Separate 12th grade lessons
            const grade12Lessons = lessonsToSchedule.filter(lesson => lesson.sinifSeviyesi === 12);
            const otherLessons = lessonsToSchedule.filter(lesson => lesson.sinifSeviyesi !== 12);
            
            // Extract unavailabilities for quick access
            const teacherUnavailabilityMap = new Map<string, { day: number; periods: number[] }[]>();
            data.teacherUnavailabilities.forEach(unavailability => {
                if (!teacherUnavailabilityMap.has(unavailability.teacher_id!)) {
                    teacherUnavailabilityMap.set(unavailability.teacher_id!, []);
                }
                
                const periodArray = [];
                for (let i = unavailability.start_period; i <= unavailability.end_period; i++) {
                    periodArray.push(i);
                }
                
                // Handle both day and day_of_week column names
                const dayValue = unavailability.day_of_week !== undefined 
                    ? unavailability.day_of_week 
                    : unavailability.day;
                
                teacherUnavailabilityMap.get(unavailability.teacher_id!)!.push({
                    day: dayValue,
                    periods: periodArray
                });
            });
            
            // Schedule lessons
            const MAX_PERIODS = 10; // Max periods per day
            const DAYS = [1, 2, 3, 4, 5]; // Monday to Friday
            
            // Create a map for quick access to days by dal ID
            const grade12DaysByDalMap = new Map<string, number[]>();
            Object.keys(data.grade12DaysByDal).forEach(dalId => {
                grade12DaysByDalMap.set(dalId, data.grade12DaysByDal[dalId]);
            });

            // Default to Monday and Wednesday if a dal doesn't have specific days set
            const getGrade12DaysForDal = (dalId: string): number[] => {
                return grade12DaysByDalMap.get(dalId) || [1, 3]; // Default to Monday and Wednesday
            };

            // Update the helper function to check if a lesson needs restricted days
            function getLessonAllowedDays(lesson: DalDers): number[] | undefined {
                // Only restrict days for 12th grade
                if (lesson.sinifSeviyesi === 12) {
                    return getGrade12DaysForDal(lesson.dalId || '');
                }
                return undefined; // No restriction for other grades
            }
            
            // First, handle compulsory assignments
            let scheduled = 0;
            existingAssignments.forEach((assignments, teacherId) => {
                assignments.forEach(assignment => {
                    const lesson = lessonsToSchedule.find(l => l.id === assignment.lessonId);
                    if (!lesson) return;
                    
                    if (lesson.bolunebilir_mi === false) {
                        // Non-divisible lessons should be scheduled in consecutive periods on the same day
                        const consecutiveSlots = findConsecutiveSlotsOnSameDay(
                            timetable,
                            teacherId,
                            data.locationIds,
                            teacherUnavailabilityMap,
                            lesson.haftalikSaat,
                            getLessonAllowedDays(lesson)
                        );
                        
                        if (consecutiveSlots.length >= lesson.haftalikSaat) {
                            // Schedule as consecutive lesson (blok ders)
                            scheduleConsecutiveLesson(
                                timetable,
                                lesson,
                                teacherId,
                                semesterTeachers.find(t => t.id === teacherId)?.name || `Öğretmen ${teacherId}`,
                                consecutiveSlots.slice(0, lesson.haftalikSaat),
                                dallar
                            );
                            
                            // Remove from lessons to schedule
                            const index = lessonsToSchedule.findIndex(l => l.id === lesson.id);
                            if (index !== -1) {
                                lessonsToSchedule.splice(index, 1);
                            }
                            
                            scheduled++;
                        }
            } else {
                        // Regular or divisible lesson
                        // Find available slots for this lesson
                        const availableSlots = findAvailableSlots(
                            timetable,
                            teacherId,
                            data.locationIds,
                            teacherUnavailabilityMap,
                            lesson.haftalikSaat,
                            getLessonAllowedDays(lesson)
                        );
                        
                        if (availableSlots.length >= lesson.haftalikSaat) {
                            // Schedule this lesson
                            scheduleLesson(
                                timetable,
                                lesson,
                                teacherId,
                                semesterTeachers.find(t => t.id === teacherId)?.name || `Öğretmen ${teacherId}`,
                                availableSlots.slice(0, lesson.haftalikSaat),
                                dallar
                            );
                            
                            // Remove from lessons to schedule
                            const index = lessonsToSchedule.findIndex(l => l.id === lesson.id);
                            if (index !== -1) {
                                lessonsToSchedule.splice(index, 1);
                            }
                            
                            scheduled++;
                        }
                    }
                });
            });
            
            // Then, distribute remaining lessons
            const assignedTeachers = new Map<string, number>(); // Track hours assigned to each teacher
            const teacherScheduledDays = new Map<string, Set<number>>(); // Track which days each teacher has classes

            data.teacherIds.forEach(teacherId => {
                assignedTeachers.set(teacherId, 0);
                teacherScheduledDays.set(teacherId, new Set<number>());
            });

            // Update the teacher hours tracking after scheduling compulsory assignments
            // After the existing assignments loop, recalculate hours and days for each teacher
            for (const teacherId of Object.keys(timetable.teacherSchedules)) {
                let totalHours = 0;
                const scheduledDays = new Set<number>();
                
                // Count all lessons in the teacher's schedule and track days
                for (let day = 1; day <= 5; day++) {
                    let hasClassOnDay = false;
                    for (let period = 1; period <= 10; period++) {
                        if (timetable.teacherSchedules[teacherId][day][period]) {
                            totalHours++;
                            hasClassOnDay = true;
                        }
                    }
                    if (hasClassOnDay) {
                        scheduledDays.add(day);
                    }
                }
                
                assignedTeachers.set(teacherId, totalHours);
                teacherScheduledDays.set(teacherId, scheduledDays);
            }

            // Then, distribute remaining lessons
            lessonsToSchedule.sort((a, b) => (b.haftalikSaat || 0) - (a.haftalikSaat || 0)); // Schedule higher weekly hours first
            
            // Helper function to find the best teacher for a lesson, considering workload balance
            function findBestTeacherForLesson(
                teacherIds: string[],
                assignedHours: Map<string, number>,
                scheduledDays: Map<string, Set<number>>,
                requiresConsecutiveSlots: boolean,
                requiredHours: number,
                unavailabilityMap: Map<string, { day: number; periods: number[] }[]>,
                timetable: TimeTable,
                locationIds: string[],
                allowedDays?: number[] // Optional parameter for limiting to specific days
            ): { teacherId: string; slots: any[] } | null {
                // Calculate target hours per teacher (for balancing)
                const totalTeachers = teacherIds.length;
                let totalAssignedHours = 0;
                teacherIds.forEach(id => {
                    totalAssignedHours += assignedHours.get(id) || 0;
                });
                
                // Target average is the current total plus new hours divided by teacher count
                const targetAverage = (totalAssignedHours + requiredHours) / totalTeachers;
                
                // Sort teachers by how far they are below the target average
                const sortedTeachers = [...teacherIds].sort((a, b) => {
                    const hoursA = assignedHours.get(a) || 0;
                    const hoursB = assignedHours.get(b) || 0;
                    
                    const diffA = targetAverage - hoursA;
                    const diffB = targetAverage - hoursB;
                    
                    // Prioritize teachers with lower hours
                    return diffB - diffA;
                });
                
                // Try to find a teacher with at least one free day
                for (const teacherId of sortedTeachers) {
                    const currentDays = scheduledDays.get(teacherId) || new Set<number>();
                    
                    // Check if this assignment would preserve at least one free day
                    // We have 5 days (1-5), so if they're scheduled on 4 or fewer days, it's ok
                    const hasFreeDayPossible = currentDays.size < 5;
                    
                    // For teachers that already have classes on all days, we'll come back to them
                    // if we can't find any teacher with a free day
                    if (hasFreeDayPossible) {
                        let slots: any[] = [];
                        
                        if (requiresConsecutiveSlots) {
                            slots = findConsecutiveSlotsOnSameDay(
                                timetable,
                                teacherId,
                                locationIds,
                                unavailabilityMap,
                                requiredHours,
                                allowedDays
                            );
                        } else {
                            slots = findAvailableSlots(
                                timetable,
                                teacherId,
                                locationIds,
                                unavailabilityMap,
                                requiredHours,
                                allowedDays
                            );
                        }
                        
                        if (slots.length >= requiredHours) {
                            // Check if these slots would preserve at least one free day
                            const newScheduledDays = new Set(currentDays);
                            
                            // Check what new days would be added by these slots
                            let wouldPreserveFreeDay = true;
                            for (let i = 0; i < requiredHours; i++) {
                                newScheduledDays.add(slots[i].day);
                                if (newScheduledDays.size === 5) {
                                    wouldPreserveFreeDay = false;
                                    break;
                                }
                            }
                            
                            if (wouldPreserveFreeDay) {
                                return { teacherId, slots: slots.slice(0, requiredHours) };
                            }
                        }
                    }
                }
                
                // If we couldn't find a teacher that preserves a free day, just find the best teacher
                // based on workload balance
                for (const teacherId of sortedTeachers) {
                    let slots: any[] = [];
                    
                    if (requiresConsecutiveSlots) {
                        slots = findConsecutiveSlotsOnSameDay(
                            timetable,
                            teacherId,
                            locationIds,
                            unavailabilityMap,
                            requiredHours,
                            allowedDays
                        );
                    } else {
                        slots = findAvailableSlots(
                            timetable,
                            teacherId,
                            locationIds,
                            unavailabilityMap,
                            requiredHours,
                            allowedDays
                        );
                    }
                    
                    if (slots.length >= requiredHours) {
                        return { teacherId, slots: slots.slice(0, requiredHours) };
                    }
                }
                
                return null; // No suitable teacher found
            }

            // Update the scheduling algorithm for divisible lessons
            for (const lesson of lessonsToSchedule) {
                // Check if this lesson requires multiple resources
                const requiresMultipleResources = lesson.requires_multiple_resources === true;
                
                // Check if this lesson is divisible
                const isDivisible = lesson.bolunebilir_mi === true;
                
                if (isDivisible) {
                    // Divisible lessons MUST be split across two days regardless of the number of hours
                    // Calculate how to split the hours
                    const totalHours = lesson.haftalikSaat;
                    const firstPartHours = Math.floor(totalHours / 2);
                    const secondPartHours = totalHours - firstPartHours;
                    
                    // Find the best teacher considering workload balance and free day
                    const bestTeacher = findBestTeacherForLesson(
                        data.teacherIds,
                        assignedTeachers,
                        teacherScheduledDays,
                        false, // Not consecutive
                        totalHours, // Total required hours
                        teacherUnavailabilityMap,
                        timetable,
                        data.locationIds,
                        getLessonAllowedDays(lesson)
                    );
                    
                    if (bestTeacher) {
                        const bestTeacherId = bestTeacher.teacherId;
                        
                        // Get available slots by day for the selected teacher
                        const availableSlotsByDay = findAvailableSlotsByDay(
                            timetable,
                            bestTeacherId,
                            data.locationIds,
                            teacherUnavailabilityMap,
                            getLessonAllowedDays(lesson)
                        );
                        
                        // Sort days by available slots (descending) to maximize efficient use
                        const sortedDays = Object.entries(availableSlotsByDay)
                            .filter(([day, slots]) => slots.length > 0)
                            .sort((a, b) => b[1].length - a[1].length)
                            .map(([day]) => parseInt(day));
                        
                        if (sortedDays.length >= 2) {
                            const firstDay = sortedDays[0];
                            const secondDay = sortedDays[1];
                            
                            // Schedule first part
                            const firstDaySlots = availableSlotsByDay[firstDay].slice(0, firstPartHours);
                            scheduleSplitLesson(
                                timetable,
                                lesson,
                                bestTeacherId,
                                semesterTeachers.find(t => t.id === bestTeacherId)?.name || `Öğretmen ${bestTeacherId}`,
                                firstDaySlots,
                                dallar,
                                1, // first part
                                totalHours,
                                firstPartHours
                            );
                            
                            // Schedule second part
                            const secondDaySlots = availableSlotsByDay[secondDay].slice(0, secondPartHours);
                            scheduleSplitLesson(
                                timetable,
                                lesson,
                                bestTeacherId,
                                semesterTeachers.find(t => t.id === bestTeacherId)?.name || `Öğretmen ${bestTeacherId}`,
                                secondDaySlots,
                                dallar,
                                2, // second part
                                totalHours,
                                secondPartHours
                            );
                            
                            // Update assigned hours and scheduled days
                            const currentHours = assignedTeachers.get(bestTeacherId) || 0;
                            assignedTeachers.set(bestTeacherId, currentHours + totalHours);
                            
                            const currentDays = teacherScheduledDays.get(bestTeacherId) || new Set<number>();
                            currentDays.add(firstDay);
                            currentDays.add(secondDay);
                            teacherScheduledDays.set(bestTeacherId, currentDays);
                            
                            scheduled++;
                        } else {
                            timetable.unassignedLessons.push(lesson);
                        }
                    } else {
                        timetable.unassignedLessons.push(lesson);
                    }
                } else if (requiresMultipleResources) {
                    // For multiple resources, we need to find 2 teachers with balanced workloads
                    // Calculate target hours per teacher (for balancing)
                    const totalTeachers = data.teacherIds.length;
                    let totalAssignedHours = 0;
                    data.teacherIds.forEach(id => {
                        totalAssignedHours += assignedTeachers.get(id) || 0;
                    });
                    
                    // Target average is the current total plus new hours divided by teacher count
                    const targetAverage = (totalAssignedHours + lesson.haftalikSaat) / totalTeachers;
                    
                    // Sort teachers by how far they are below the target average
                    const sortedTeachers = [...data.teacherIds].sort((a, b) => {
                        const hoursA = assignedTeachers.get(a) || 0;
                        const hoursB = assignedTeachers.get(b) || 0;
                        
                        const diffA = targetAverage - hoursA;
                        const diffB = targetAverage - hoursB;
                        
                        // Prioritize teachers with lower hours
                        return diffB - diffA;
                    });
                    
                    // Find two teachers with the most balanced workload
                    let bestTeacherId1 = '';
                    let bestTeacherId2 = '';
                    let bestSlots: { day: number; period: number; locationId: string; secondLocationId: string }[] = [];
                    
                    // Try each teacher as the first teacher
                    for (const teacherId1 of sortedTeachers) {
                        // Check if we can maintain a free day for this teacher
                        const currentDays1 = teacherScheduledDays.get(teacherId1) || new Set<number>();
                        
                        // Get available slots for the first teacher
                        const availableSlots1 = findAvailableSlots(
                            timetable,
                            teacherId1,
                            data.locationIds,
                            teacherUnavailabilityMap,
                            lesson.haftalikSaat,
                            getLessonAllowedDays(lesson)
                        );
                        
                        if (availableSlots1.length >= lesson.haftalikSaat) {
                            // Try to find a second teacher
                            for (const teacherId2 of sortedTeachers) {
                                if (teacherId2 === teacherId1) continue; // Skip same teacher
                                
                                // Check if we can maintain a free day for the second teacher
                                const currentDays2 = teacherScheduledDays.get(teacherId2) || new Set<number>();
                                
                                // Find matching slots between the two teachers
                                const matchingSlots = findMatchingTeacherSlots(
                                    timetable,
                                    teacherId2,
                                    availableSlots1,
                                    teacherUnavailabilityMap,
                                    data.locationIds,
                                    getLessonAllowedDays(lesson)
                                );
                                
                                if (matchingSlots.length >= lesson.haftalikSaat) {
                                    // Check if these slots would preserve at least one free day for both teachers
                                    const newDays1 = new Set(currentDays1);
                                    const newDays2 = new Set(currentDays2);
                                    
                                    let wouldPreserveFreeDay = true;
                                    for (let i = 0; i < lesson.haftalikSaat; i++) {
                                        newDays1.add(matchingSlots[i].day);
                                        newDays2.add(matchingSlots[i].day);
                                        
                                        if (newDays1.size === 5 || newDays2.size === 5) {
                                            wouldPreserveFreeDay = false;
                                            break;
                                        }
                                    }
                                    
                                    if (wouldPreserveFreeDay) {
                                        bestTeacherId1 = teacherId1;
                                        bestTeacherId2 = teacherId2;
                                        bestSlots = matchingSlots.slice(0, lesson.haftalikSaat);
                                        break;
                                    }
                                    
                                    // If we haven't found a solution that preserves free days yet,
                                    // save this as a potential fallback
                                    if (bestTeacherId1 === '') {
                                        bestTeacherId1 = teacherId1;
                                        bestTeacherId2 = teacherId2;
                                        bestSlots = matchingSlots.slice(0, lesson.haftalikSaat);
                                    }
                                }
                            }
                            
                            if (bestTeacherId1 !== '' && bestTeacherId2 !== '' && bestSlots.length >= lesson.haftalikSaat) {
                                // Schedule this multi-resource lesson
                                scheduleMultiResourceLesson(
                                    timetable,
                                    lesson,
                                    bestTeacherId1,
                                    semesterTeachers.find(t => t.id === bestTeacherId1)?.name || `Öğretmen ${bestTeacherId1}`,
                                    bestTeacherId2,
                                    semesterTeachers.find(t => t.id === bestTeacherId2)?.name || `Öğretmen ${bestTeacherId2}`,
                                    bestSlots,
                                    dallar
                                );
                                
                                // Update assigned hours and scheduled days for both teachers
                                const currentHours1 = assignedTeachers.get(bestTeacherId1) || 0;
                                const currentHours2 = assignedTeachers.get(bestTeacherId2) || 0;
                                
                                assignedTeachers.set(bestTeacherId1, currentHours1 + lesson.haftalikSaat);
                                assignedTeachers.set(bestTeacherId2, currentHours2 + lesson.haftalikSaat);
                                
                                const currentDays1 = teacherScheduledDays.get(bestTeacherId1) || new Set<number>();
                                const currentDays2 = teacherScheduledDays.get(bestTeacherId2) || new Set<number>();
                                
                                bestSlots.forEach(slot => {
                                    currentDays1.add(slot.day);
                                    currentDays2.add(slot.day);
                                });
                                
                                teacherScheduledDays.set(bestTeacherId1, currentDays1);
                                teacherScheduledDays.set(bestTeacherId2, currentDays2);
                                
                                scheduled++;
                            } else {
                                timetable.unassignedLessons.push(lesson);
                            }
                        }
                    }
                } else {
                    // Non-divisible lessons must be scheduled on the same day in consecutive periods
                    // Find the best teacher considering workload balance and free day
                    const bestTeacher = findBestTeacherForLesson(
                        data.teacherIds,
                        assignedTeachers,
                        teacherScheduledDays,
                        true, // Consecutive slots required
                        lesson.haftalikSaat,
                        teacherUnavailabilityMap,
                        timetable,
                        data.locationIds,
                        getLessonAllowedDays(lesson)
                    );
                    
                    if (bestTeacher) {
                        const bestTeacherId = bestTeacher.teacherId;
                        const bestSlots = bestTeacher.slots;
                        
                        // Double-check that all slots are on the same day and consecutive
                        const allSameDay = bestSlots.every(slot => slot.day === bestSlots[0].day);
                        let allConsecutive = true;
                        for (let i = 0; i < bestSlots.length - 1; i++) {
                            if (bestSlots[i].period + 1 !== bestSlots[i + 1].period) {
                                allConsecutive = false;
                                break;
                            }
                        }
                        
                        if (allSameDay && allConsecutive) {
                            // Schedule this lesson
                            scheduleConsecutiveLesson(
                                timetable,
                                lesson,
                                bestTeacherId,
                                semesterTeachers.find(t => t.id === bestTeacherId)?.name || `Öğretmen ${bestTeacherId}`,
                                bestSlots,
                                dallar
                            );
                            
                            // Update assigned hours and scheduled days
                            const currentHours = assignedTeachers.get(bestTeacherId) || 0;
                            assignedTeachers.set(bestTeacherId, currentHours + lesson.haftalikSaat);
                            
                            const currentDays = teacherScheduledDays.get(bestTeacherId) || new Set<number>();
                            currentDays.add(bestSlots[0].day);
                            teacherScheduledDays.set(bestTeacherId, currentDays);
                            
                            scheduled++;
                        } else {
                            console.error(`Found slots for ${lesson.dersAdi} but they are not all on the same day or not consecutive`);
                            timetable.unassignedLessons.push(lesson);
                        }
                    } else {
                        console.log(`No teacher found with enough consecutive slots for lesson ${lesson.dersAdi}`);
                        timetable.unassignedLessons.push(lesson);
                    }
                }
            }

            // After scheduling, add information about free days to the timetable output
            const teacherFreeDays = {};
            const minMaxHours = { min: Infinity, max: 0, avgDeviation: 0 };

            // Calculate total hours and min/max for stats
            let totalHours = 0;
            data.teacherIds.forEach(teacherId => {
                const hours = assignedTeachers.get(teacherId) || 0;
                totalHours += hours;
                
                if (hours < minMaxHours.min) minMaxHours.min = hours;
                if (hours > minMaxHours.max) minMaxHours.max = hours;
                
                // Calculate which days are free for this teacher
                const scheduledDays = teacherScheduledDays.get(teacherId) || new Set<number>();
                const freeDays = [];
                for (let day = 1; day <= 5; day++) {
                    if (!scheduledDays.has(day)) {
                        freeDays.push(day);
                    }
                }
                
                // Convert day numbers to names
                const freeDayNames = freeDays.map(day => dayNumberMap[day]);
                teacherFreeDays[teacherId] = freeDayNames;
            });

            // Calculate average and deviation
            const avgHours = totalHours / data.teacherIds.length;
            let totalDeviation = 0;
            data.teacherIds.forEach(teacherId => {
                const hours = assignedTeachers.get(teacherId) || 0;
                totalDeviation += Math.abs(hours - avgHours);
            });
            minMaxHours.avgDeviation = totalDeviation / data.teacherIds.length;

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Calculate total teaching hours for each teacher at the end of scheduling
            const teacherTotalHours = {};

            // Count all lessons in the teacher's schedule
            for (const teacherId of Object.keys(timetable.teacherSchedules)) {
                let totalHours = 0;
                
                // Count all lessons in the teacher's schedule
                for (let day = 1; day <= 5; day++) {
                    for (let period = 1; period <= 10; period++) {
                        if (timetable.teacherSchedules[teacherId][day][period]) {
                            totalHours++;
                        }
                    }
                }
                
                teacherTotalHours[teacherId] = totalHours;
            }

                return { 
                success: true,
                message: `Dağıtım tamamlandı! ${scheduled} ders atandı. ${timetable.unassignedLessons.length} ders atanamadı. ${excludedLessons.length} ders otomatik çizelgeleme dışında.`,
                timetable: {
                    ...timetable,
                    teacherTotalHours,
                    teacherFreeDays,
                    schedulingStats: minMaxHours,
                    grade12DaysByDal: data.grade12DaysByDal // Use the dal-specific days mapping
                }
            };
        },
            onSuccess: (result) => {
            console.log("Scheduler success:", result);
                if (result.success) {
                toast.success(result.message || 'Dağıtım başarıyla tamamlandı!');
                if (result.timetable) {
                    setGeneratedTimetable(result.timetable);
                    setShowTimetable(true);
                }
                } else {
                toast.error(result.message || 'Dağıtım sırasında bir hata oluştu.');
                }
            },
            onError: (error: Error) => {
            console.log("Scheduler error:", error);
            toast.error(`Dağıtım hatası: ${error.message}`);
        },
    });
    
    // Helper function to initialize weekly schedule
    function initializeWeeklySchedule(ownerName: string): WeeklySchedule {
        const schedule: WeeklySchedule = {};
        
        // Days 1-5 (Monday to Friday)
        for (let day = 1; day <= 5; day++) {
            schedule[day] = {};
            
            // Periods 1-10
            for (let period = 1; period <= 10; period++) {
                schedule[day][period] = null;
            }
        }
        
        return schedule;
    }
    
    // Helper function to find available slots
    function findAvailableSlots(
        timetable: TimeTable,
        teacherId: string,
        locationIds: string[],
        teacherUnavailabilityMap: Map<string, { day: number; periods: number[] }[]>,
        requiredSlots: number,
        allowedDays?: number[] // Optional parameter for limiting to specific days
    ): { day: number; period: number; locationId: string }[] {
        const availableSlots: { day: number; period: number; locationId: string }[] = [];
        
        // Days 1-5 (Monday to Friday) or only the allowed days if specified
        const daysToCheck = allowedDays || [1, 2, 3, 4, 5];
        
        for (const day of daysToCheck) {
            // Check teacher unavailabilities for this day
            const unavailablePeriods = new Set<number>();
            if (teacherUnavailabilityMap.has(teacherId)) {
                teacherUnavailabilityMap.get(teacherId)!.forEach(unavailability => {
                    if (unavailability.day === day) {
                        unavailability.periods.forEach(period => {
                            unavailablePeriods.add(period);
                        });
                    }
                });
            }
            
            // Periods 1-10
            for (let period = 1; period <= 10; period++) {
                // Skip if teacher is unavailable
                if (unavailablePeriods.has(period)) continue;
                
                // Skip if teacher already has a class
                if (timetable.teacherSchedules[teacherId]?.[day]?.[period]) continue;
                
                // Find an available location
                for (const locationId of locationIds) {
                    if (!timetable.locationSchedules[locationId]?.[day]?.[period]) {
                        // This slot is available
                        availableSlots.push({ day, period, locationId });
                        break; // Only need one location per slot
                    }
                }
            }
        }
        
        return availableSlots;
    }
    
    // Helper function to schedule a lesson
    function scheduleLesson(
        timetable: TimeTable,
        lesson: DalDers,
        teacherId: string,
        teacherName: string,
        slots: { day: number; period: number; locationId: string }[],
        dallar: Dal[]
    ): void {
        // Generate a unique and consistent color for this lesson
        const lessonColor = getLessonColor(lesson.id!);
        
        // Check if this is a non-divisible lesson (bölünemez)
        const isConsecutive = lesson.bolunebilir_mi === false;
        
        slots.forEach(slot => {
            const timeSlot: TimeSlot = {
                day: slot.day,
                period: slot.period,
                teacherId,
                teacherName,
                lessonId: lesson.id!,
                lessonName: lesson.dersAdi,
                locationId: slot.locationId,
                locationName: locations.find(l => l.id === slot.locationId)?.name || `Sınıf ${slot.locationId}`,
                dalId: lesson.dalId!,
                dalName: dallar.find(d => d.id === lesson.dalId)?.name || 'Bilinmeyen Dal',
                sinifSeviyesi: lesson.sinifSeviyesi,
                color: lessonColor, // Add consistent color
                isConsecutive: isConsecutive, // Set based on lesson property
                totalConsecutiveHours: isConsecutive ? lesson.haftalikSaat : undefined // Set total hours if consecutive
            };
            
            // Update teacher schedule
            timetable.teacherSchedules[teacherId][slot.day][slot.period] = timeSlot;
            
            // Update location schedule
            timetable.locationSchedules[slot.locationId][slot.day][slot.period] = timeSlot;
        });
    }

    // Helper function to find slots that match between two teachers
    function findMatchingTeacherSlots(
        timetable: TimeTable,
        teacherId: string,
        availableSlotsToMatch: { day: number; period: number; locationId: string }[],
        teacherUnavailabilityMap: Map<string, { day: number; periods: number[] }[]>,
        locationIds: string[],
        allowedDays?: number[] // Optional parameter for limiting to specific days
    ): { day: number; period: number; locationId: string; secondLocationId: string }[] {
        const matchingSlots: { day: number; period: number; locationId: string; secondLocationId: string }[] = [];
        
        // Check teacher unavailabilities
        const unavailablePeriods = new Map<number, Set<number>>();
        
        if (teacherUnavailabilityMap.has(teacherId)) {
            teacherUnavailabilityMap.get(teacherId)!.forEach(unavailability => {
                if (!unavailablePeriods.has(unavailability.day)) {
                    unavailablePeriods.set(unavailability.day, new Set<number>());
                }
                unavailability.periods.forEach(period => {
                    unavailablePeriods.get(unavailability.day)!.add(period);
                });
            });
        }
        
        // Check for each slot from first teacher if second teacher is available
        for (const slot of availableSlotsToMatch) {
            // Skip if second teacher is unavailable
            if (
                unavailablePeriods.has(slot.day) && 
                unavailablePeriods.get(slot.day)!.has(slot.period)
            ) continue;
            
            // Skip if second teacher already has a class
            if (timetable.teacherSchedules[teacherId]?.[slot.day]?.[slot.period]) continue;
            
            // Find a different available location than the first teacher
            for (const locationId of locationIds) {
                // Skip same location as first teacher
                if (locationId === slot.locationId) continue;
                
                // Check if this location is available
                if (!timetable.locationSchedules[locationId]?.[slot.day]?.[slot.period]) {
                    // Found a match with different location
                    matchingSlots.push({
                        day: slot.day,
                        period: slot.period,
                        locationId: slot.locationId,
                        secondLocationId: locationId
                    });
                    break; // Only need one location per slot
                }
            }
        }
        
        return matchingSlots;
    }

    // Helper function to schedule a multi-resource lesson
    function scheduleMultiResourceLesson(
        timetable: TimeTable,
        lesson: DalDers,
        teacherId1: string,
        teacherName1: string,
        teacherId2: string,
        teacherName2: string,
        slots: { day: number; period: number; locationId: string; secondLocationId: string }[],
        dallar: Dal[]
    ): void {
        // Generate a unique and consistent color for this lesson
        const lessonColor = getLessonColor(lesson.id!);
        
        // Check if this is a non-divisible lesson (bölünemez)
        const isConsecutive = lesson.bolunebilir_mi === false;
        
        slots.forEach(slot => {
            const timeSlot: TimeSlot = {
                day: slot.day,
                period: slot.period,
                teacherId: teacherId1,
                teacherName: teacherName1,
                lessonId: lesson.id!,
                lessonName: lesson.dersAdi,
                locationId: slot.locationId,
                locationName: locations.find(l => l.id === slot.locationId)?.name || `Sınıf ${slot.locationId}`,
                dalId: lesson.dalId!,
                dalName: dallar.find(d => d.id === lesson.dalId)?.name || 'Bilinmeyen Dal',
                sinifSeviyesi: lesson.sinifSeviyesi,
                // Add multi-resource information
                secondTeacherId: teacherId2,
                secondTeacherName: teacherName2,
                secondLocationId: slot.secondLocationId,
                secondLocationName: locations.find(l => l.id === slot.secondLocationId)?.name || `Sınıf ${slot.secondLocationId}`,
                isMultiResource: true,
                color: lessonColor, // Add consistent color
                isConsecutive: isConsecutive, // Set based on lesson property
                totalConsecutiveHours: isConsecutive ? lesson.haftalikSaat : undefined // Set total hours if consecutive
            };
            
            // Update both teacher schedules
            timetable.teacherSchedules[teacherId1][slot.day][slot.period] = timeSlot;
            timetable.teacherSchedules[teacherId2][slot.day][slot.period] = timeSlot;
            
            // Update both location schedules
            timetable.locationSchedules[slot.locationId][slot.day][slot.period] = timeSlot;
            timetable.locationSchedules[slot.secondLocationId][slot.day][slot.period] = timeSlot;
        });
    }

    // Helper function to find available slots organized by day
    function findAvailableSlotsByDay(
        timetable: TimeTable,
        teacherId: string,
        locationIds: string[],
        teacherUnavailabilityMap: Map<string, { day: number; periods: number[] }[]>,
        allowedDays?: number[] // Optional parameter for limiting to specific days
    ): { [day: number]: { day: number; period: number; locationId: string }[] } {
        const slotsByDay: { [day: number]: { day: number; period: number; locationId: string }[] } = {};
        
        // Initialize empty arrays for each day
        const daysToCheck = allowedDays || [1, 2, 3, 4, 5];
        for (const day of daysToCheck) {
            slotsByDay[day] = [];
        }
        
        // Find available slots for each day
        for (const day of daysToCheck) {
            // Check teacher unavailabilities for this day
            const unavailablePeriods = new Set<number>();
            if (teacherUnavailabilityMap.has(teacherId)) {
                teacherUnavailabilityMap.get(teacherId)!.forEach(unavailability => {
                    if (unavailability.day === day) {
                        unavailability.periods.forEach(period => {
                            unavailablePeriods.add(period);
                        });
                    }
                });
            }
            
            // Periods 1-10
            for (let period = 1; period <= 10; period++) {
                // Skip if teacher is unavailable
                if (unavailablePeriods.has(period)) continue;
                
                // Skip if teacher already has a class
                if (timetable.teacherSchedules[teacherId]?.[day]?.[period]) continue;
                
                // Find an available location
                for (const locationId of locationIds) {
                    if (!timetable.locationSchedules[locationId]?.[day]?.[period]) {
                        // This slot is available
                        slotsByDay[day].push({ day, period, locationId });
                        break; // Only need one location per slot
                    }
                }
            }
        }
        
        return slotsByDay;
    }

    // Helper function to schedule a split lesson
    function scheduleSplitLesson(
        timetable: TimeTable,
        lesson: DalDers,
        teacherId: string,
        teacherName: string,
        slots: { day: number; period: number; locationId: string }[],
        dallar: Dal[],
        splitGroup: number,
        totalHours: number,
        splitHours: number
    ): void {
        // Generate a unique and consistent color for this lesson
        const lessonColor = getLessonColor(lesson.id!);
        
        // Split lessons are by definition divisible, so they can't be consecutive (blok ders)
        const isConsecutive = false;
        
        slots.forEach(slot => {
            const timeSlot: TimeSlot = {
                day: slot.day,
                period: slot.period,
                teacherId,
                teacherName,
                lessonId: lesson.id!,
                lessonName: lesson.dersAdi,
                locationId: slot.locationId,
                locationName: locations.find(l => l.id === slot.locationId)?.name || `Sınıf ${slot.locationId}`,
                dalId: lesson.dalId!,
                dalName: dallar.find(d => d.id === lesson.dalId)?.name || 'Bilinmeyen Dal',
                sinifSeviyesi: lesson.sinifSeviyesi,
                // Add split information
                isSplit: true,
                splitGroup,
                totalHours,
                splitHours,
                color: lessonColor, // Add consistent color
                isConsecutive: isConsecutive,
                totalConsecutiveHours: undefined
            };
            
            // Update teacher schedule
            timetable.teacherSchedules[teacherId][slot.day][slot.period] = timeSlot;
            
            // Update location schedule
            timetable.locationSchedules[slot.locationId][slot.day][slot.period] = timeSlot;
        });
    }

    // Helper function to find consecutive slots on the same day
    function findConsecutiveSlotsOnSameDay(
        timetable: TimeTable,
        teacherId: string,
        locationIds: string[],
        teacherUnavailabilityMap: Map<string, { day: number; periods: number[] }[]>,
        requiredSlots: number,
        allowedDays?: number[] // Optional parameter for limiting to specific days
    ): { day: number; period: number; locationId: string }[] {
        // Get available slots by day
        const slotsByDay = findAvailableSlotsByDay(
            timetable,
            teacherId,
            locationIds,
            teacherUnavailabilityMap,
            allowedDays
        );
        
        // For each day, find consecutive slots
        const daysToCheck = allowedDays || [1, 2, 3, 4, 5];
        
        for (const day of daysToCheck) {
            if (slotsByDay[day] && slotsByDay[day].length >= requiredSlots) {
                // Sort slots by period
                const sortedSlots = slotsByDay[day].sort((a, b) => a.period - b.period);
                
                // Find consecutive sequences by checking every possible starting position
                for (let i = 0; i <= sortedSlots.length - requiredSlots; i++) {
                    const potentialConsecutive = sortedSlots.slice(i, i + requiredSlots);
                    
                    // Check if slots are truly consecutive (adjacent periods)
                    let isConsecutive = true;
                    for (let j = 0; j < potentialConsecutive.length - 1; j++) {
                        if (potentialConsecutive[j].period + 1 !== potentialConsecutive[j + 1].period) {
                            isConsecutive = false;
                            break;
                        }
                    }
                    
                    // Also ensure all slots are on the same day
                    const allSameDay = potentialConsecutive.every(slot => slot.day === potentialConsecutive[0].day);
                    
                    if (isConsecutive && allSameDay) {
                        // Make sure we only return slots from exactly one day
                        console.log(`Found ${requiredSlots} consecutive slots on day ${day}`);
                        return potentialConsecutive;
                    }
                }
            }
        }
        
        // Log when we fail to find consecutive slots
        console.log(`Could not find ${requiredSlots} consecutive slots for teacher ${teacherId}`);
        return []; // No consecutive slots found
    }

    // Function to schedule lesson with consecutive slots
    function scheduleConsecutiveLesson(
        timetable: TimeTable,
        lesson: DalDers,
        teacherId: string,
        teacherName: string,
        slots: { day: number; period: number; locationId: string }[],
        dallar: Dal[]
    ): void {
        // Generate a unique and consistent color for this lesson
        const lessonColor = getLessonColor(lesson.id!);
        
        slots.forEach(slot => {
            const timeSlot: TimeSlot = {
                day: slot.day,
                period: slot.period,
                teacherId,
                teacherName,
                lessonId: lesson.id!,
                lessonName: lesson.dersAdi,
                locationId: slot.locationId,
                locationName: locations.find(l => l.id === slot.locationId)?.name || `Sınıf ${slot.locationId}`,
                dalId: lesson.dalId!,
                dalName: dallar.find(d => d.id === lesson.dalId)?.name || 'Bilinmeyen Dal',
                sinifSeviyesi: lesson.sinifSeviyesi,
                color: lessonColor, // Add consistent color
                isConsecutive: true, // Always true for consecutive lessons
                isSplit: false, // Not split
                totalConsecutiveHours: lesson.haftalikSaat // Total consecutive hours
            };
            
            // Update teacher schedule
            timetable.teacherSchedules[teacherId][slot.day][slot.period] = timeSlot;
            
            // Update location schedule
            timetable.locationSchedules[slot.locationId][slot.day][slot.period] = timeSlot;
        });
    }

    const handleStartDistribution = () => {
        if (canStartDistribution && schedulerInputData) {
            console.log("Starting distribution with data:", schedulerInputData);
            setShowTimetable(false); // Hide previous timetable if any
            runSchedulerMutation.mutate(schedulerInputData);
        } else {
            toast.warn("Gerekli tüm seçimler yapılmadığı için dağıtım başlatılamıyor.");
        }
    };

    // Replace handleGrade12DaysChange with this new version that handles dal-specific days
    const handleGrade12DaysChange = (dalId: string, day: number) => {
        setGrade12DaysByDal(prev => {
            const currentDays = prev[dalId] || [];
            
            if (currentDays.includes(day)) {
                // Remove day if already selected
                return {
                    ...prev,
                    [dalId]: currentDays.filter(d => d !== day)
                };
            } else if (currentDays.length < 2) {
                // Add day if we have less than 2 days selected
                return {
                    ...prev,
                    [dalId]: [...currentDays, day]
                };
            }
            // Otherwise return unchanged (max 2 days)
            return prev;
        });
    };

    if (!selectedSemesterId) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-200px)] text-center p-8">
          <AcademicCapIcon className="w-16 h-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Sömestr Seçilmedi</h2>
          <p className="text-gray-500">
            Akıllı ders programı oluşturmak için lütfen önce bir sömestr seçin.
          </p>
        </div>
      );
    }

    // Custom styles for react-select to better match Tailwind form inputs
    const selectStyles = {
        control: (base: any, state: any) => ({
            ...base,
            borderColor: state.isFocused ? '#6366f1' : '#d1d5db', // Tailwind indigo-500 and gray-300
            boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : base.boxShadow,
            borderRadius: '0.375rem', // rounded-md
            padding: '0.375rem', // ~p-2, adjust as needed
            minHeight: '42px', // Match default input height
            backgroundColor: state.isDisabled ? '#f9fafb' : base.backgroundColor, // Tailwind gray-50
            opacity: state.isDisabled ? 0.6 : 1,
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#e0e7ff' : base.backgroundColor, // Tailwind indigo-600 and indigo-100
            color: state.isSelected ? 'white' : base.color,
        }),
        multiValue: (base: any) => ({
            ...base,
            backgroundColor: '#e0e7ff', // Tailwind indigo-100
        }),
        multiValueLabel: (base: any) => ({
            ...base,
            color: '#3730a3', // Tailwind indigo-800
        }),
        multiValueRemove: (base: any) => ({
            ...base,
            color: '#3730a3',
            ':hover': {
                backgroundColor: '#c7d2fe', // Tailwind indigo-200
                color: '#312e81', // Tailwind indigo-900
            },
        }),
        placeholder: (base: any) => ({
            ...base,
            color: '#6b7280', // Tailwind gray-500
        }),
    };

    // Add UI for selecting which days 12th graders attend
    const grade12DayLabels = {
        1: "Pazartesi",
        2: "Salı",
        3: "Çarşamba",
        4: "Perşembe",
        5: "Cuma"
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Akıllı Ders Programı Oluşturma</h1>
            
            <div>
                <p className="text-md text-gray-700">Seçili Sömestr: <span className="font-semibold text-indigo-600">{isLoadingAllSemesters ? 'Yükleniyor...' : selectedSemesterName}</span></p>
            </div>

            {/* Main Grid for Selectors and Info */} 
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Selectors */} 
                <div className="lg:col-span-1 space-y-6">
                    {/* Branch Selector */} 
                    <div className="bg-white p-6 rounded-lg shadow">
                        <label htmlFor="branch-select" className="block text-lg font-medium text-gray-800 mb-2">1. Branş Seçimi</label>
                        <select 
                            id="branch-select"
                            value={selectedBranchId || ''}
                            onChange={handleBranchChange}
                            disabled={isLoadingBranches || branches.length === 0}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 disabled:opacity-60 disabled:bg-gray-50"
                        >
                            <option value="">-- Lütfen Bir Branş Seçin --</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id!}>{branch.name}</option>
                            ))}
                        </select>
                        {isLoadingBranches && <p className="text-sm text-gray-500 mt-2">Branşlar yükleniyor...</p>}
                        {errorBranches && <p className="text-sm text-red-600 mt-2">Branşlar yüklenemedi: {errorBranches.message}</p>}
                        {!isLoadingBranches && branches.length === 0 && selectedSemesterId && <p className="text-sm text-yellow-600 mt-2">Uygun branş bulunamadı.</p>}
                    </div>

                    {/* Dal Selector (react-select) */} 
                    {selectedBranchId && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <label htmlFor="dal-select-react" className="block text-lg font-medium text-gray-800 mb-2">2. Dal Seçimi (Çoklu Seçim)</label>
                            <Select
                                id="dal-select-react"
                                isMulti
                                options={dalOptions}
                                value={dalOptions.filter(opt => selectedDalIds.includes(opt.value))}
                                onChange={handleDalChange}
                                isDisabled={isLoadingDallar || !selectedBranchId || dallar.length === 0}
                                placeholder="-- Dal Seçin/Seçinler --"
                                className="mt-1 w-full"
                                classNamePrefix="react-select"
                                styles={selectStyles}
                                noOptionsMessage={() => "Dal bulunamadı"}
                            />
                            {isLoadingDallar && <p className="text-sm text-gray-500 mt-2">Dallar yükleniyor...</p>}
                            {errorDallar && <p className="text-sm text-red-600 mt-2">Dallar yüklenemedi: {errorDallar.message}</p>}
                            {!isLoadingDallar && selectedBranchId && dallar.length === 0 && <p className="text-sm text-yellow-600 mt-2">Bu branşa ait dal bulunamadı.</p>}
                        </div>
                    )}

                    {/* Teacher Selector (react-select) */} 
                    {selectedBranchId && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <label htmlFor="teacher-select-react" className="block text-lg font-medium text-gray-800 mb-2">3. Öğretmen Seçimi (Çoklu Seçim)</label>
                            <Select
                                id="teacher-select-react"
                                isMulti
                                options={teacherOptions}
                                value={teacherOptions.filter(opt => selectedTeacherIds.includes(opt.value))}
                                onChange={handleTeacherChange}
                                isDisabled={isLoadingSemesterTeachers || !selectedBranchId || filteredTeachers.length === 0} 
                                placeholder="-- Öğretmen Seçin/Seçinler --"
                                className="mt-1 w-full"
                                classNamePrefix="react-select"
                                styles={selectStyles}
                                noOptionsMessage={() => "Öğretmen bulunamadı"}
                            />
                            {isLoadingSemesterTeachers && <p className="text-sm text-gray-500 mt-2">Öğretmenler yükleniyor...</p>}
                            {errorSemesterTeachers && <p className="text-sm text-red-600 mt-2">Öğretmenler yüklenemedi: {errorSemesterTeachers.message}</p>}
                            {!isLoadingSemesterTeachers && selectedBranchId && filteredTeachers.length === 0 && <p className="text-sm text-yellow-600 mt-2">Bu branşta öğretmen bulunamadı.</p>}
                        </div>
                    )}
                    
                    {/* Location Selector (react-select) */} 
                    {selectedSemesterId && ( // Show if semester is selected, locations are fetched based on semester
                        <div className="bg-white p-6 rounded-lg shadow">
                            <label htmlFor="location-select-react" className="block text-lg font-medium text-gray-800 mb-2">4. Sınıf/Lab. Seçimi (Çoklu Seçim)</label>
                            <Select
                                id="location-select-react"
                                isMulti
                                options={locationOptions}
                                value={locationOptions.filter(opt => selectedLocationIds.includes(opt.value))}
                                onChange={handleLocationChange}
                                isDisabled={isLoadingLocations || locations.length === 0}
                                placeholder="-- Sınıf/Lab Seçin/Seçinler --"
                                className="mt-1 w-full"
                                classNamePrefix="react-select"
                                styles={selectStyles}
                                noOptionsMessage={() => "Sınıf/Lab bulunamadı"}
                            />
                            {isLoadingLocations && <p className="text-sm text-gray-500 mt-2">Sınıf/Lablar yükleniyor...</p>}
                            {errorLocations && <p className="text-sm text-red-600 mt-2">Sınıf/Lablar yüklenemedi: {errorLocations.message}</p>}
                            {!isLoadingLocations && locations.length === 0 && selectedSemesterId && <p className="text-sm text-yellow-600 mt-2">Bu sömestr için tanımlı sınıf/lab bulunamadı.</p>}
                        </div>
                    )}

                    {/* Replace the 12th Grade Days Selector with dal-specific selectors */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="block text-lg font-medium text-gray-800 mb-4">12. Sınıflar İçin Dal Bazlı Okul Günleri</h3>
                        
                        {selectedDalIds.length > 0 ? (
                            <div className="space-y-6">
                                {selectedDalIds.map(dalId => {
                                    const dalName = getDalNameById(dalId);
                                    const selectedDays = grade12DaysByDal[dalId] || [];
                                    
                                    return (
                                        <div key={dalId} className="border-t pt-4 first:border-t-0 first:pt-0">
                                            <div className="flex items-center mb-2">
                                                <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                                                    {dalName}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {[1, 2, 3, 4, 5].map(day => (
                                                    <button
                                                        key={day}
                                                        onClick={() => handleGrade12DaysChange(dalId, day)}
                                                        className={`px-3 py-2 rounded-md text-sm ${
                                                            selectedDays.includes(day)
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {grade12DayLabels[day as keyof typeof grade12DayLabels]}
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            {selectedDays.length === 2 ? (
                                                <div className="text-green-600 text-sm mt-1">
                                                    {selectedDays.map(d => grade12DayLabels[d as keyof typeof grade12DayLabels]).join(' ve ')} günleri seçildi
                                                </div>
                                            ) : (
                                                <div className="text-yellow-600 text-sm mt-1">
                                                    Lütfen tam olarak 2 gün seçin. Şu anda {selectedDays.length} gün seçili.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-gray-500 italic">
                                Dal seçimi yapmadınız. 12. sınıf dersleri için dal-bazlı gün belirlemek için önce yukarıdan dalları seçin.
                            </div>
                        )}
                        
                        <p className="text-sm text-gray-500 mt-4">
                            Her dal için, 12. sınıf dersleri yalnızca seçilen günlerde programlanacaktır. 
                            Dallar için farklı günler seçebilirsiniz.
                        </p>
                    </div>
                </div>

                {/* Column 2: Info (Summary, Lessons & Unavailability) */} 
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Card for Distribution Parameters */} 
                    {(selectedBranchId || selectedDalIds.length > 0 || selectedTeacherIds.length > 0 || selectedLocationIds.length > 0) && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center mb-4">
                                <ClipboardDocumentCheckIcon className="h-6 w-6 text-indigo-600 mr-3" />
                                <h3 className="text-xl font-semibold text-gray-800">Dağıtım için Seçilen Parametreler</h3>
                            </div>
                            <dl className="space-y-3 text-sm">
                                {selectedBranchId && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <dt className="font-medium text-gray-600">Branş:</dt>
                                        <dd className="col-span-2 text-gray-800">{isLoadingBranches ? 'Yükleniyor...' : selectedBranchName}</dd>
                                    </div>
                                )}
                                {selectedDalIds.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <dt className="font-medium text-gray-600">Dallar:</dt>
                                        <dd className="col-span-2 text-gray-800">{isLoadingDallar ? 'Yükleniyor...' : selectedDalNames}</dd>
                                    </div>
                                )}
                                {selectedTeacherIds.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <dt className="font-medium text-gray-600">Öğretmenler:</dt>
                                        <dd className="col-span-2 text-gray-800">{isLoadingSemesterTeachers ? 'Yükleniyor...' : selectedTeacherNames}</dd>
                                    </div>
                                )}
                                {selectedLocationIds.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <dt className="font-medium text-gray-600">Sınıf/Lablar:</dt>
                                        <dd className="col-span-2 text-gray-800">{isLoadingLocations ? 'Yükleniyor...' : selectedLocationNames}</dd>
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t mt-3">
                                    <dt className="font-medium text-gray-600">Dal Dersleri (Toplam):</dt>
                                    <dd className="col-span-2 text-gray-800 font-semibold">{isLoadingDalLessons ? 'Hesaplanıyor...' : `${dalLessons.length} ders`}</dd>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <dt className="font-medium text-gray-600">Öğretmen Müsait Değil Periyotları:</dt>
                                    <dd className="col-span-2 text-gray-800 font-semibold">{isLoadingTeacherUnavailability ? 'Hesaplanıyor...' : `${teacherUnavailability.length} kayıt`}</dd>
                                </div>

                                {/* Compulsory Teacher Assignments Section - Updated */} 
                                {selectedTeacherIds.length > 0 && (
                                    <div className="pt-3 border-t mt-3 space-y-2">
                                        <div className="flex items-center mb-1">
                                            <IdentificationIcon className="h-5 w-5 text-indigo-500 mr-2" />
                                            <h4 className="font-medium text-gray-600">Öğretmene Atanmış Zorunlu Dersler:</h4>
                                        </div>
                                        {isLoadingCompulsoryAssignments && <p className="text-gray-500 italic col-span-3">Zorunlu atamalar yükleniyor...</p>}
                                        {errorCompulsoryAssignments && <p className="text-red-600 italic col-span-3">Zorunlu atamalar yüklenemedi: {errorCompulsoryAssignments.message}</p>}
                                        {!isLoadingCompulsoryAssignments && !errorCompulsoryAssignments && (
                                            compulsoryAssignmentsForDisplay.size > 0 ? (
                                                Array.from(compulsoryAssignmentsForDisplay.entries()).map(([teacherName, assignedLessons]) => (
                                                    <div key={teacherName} className="pl-2">
                                                        <p className="text-gray-700 font-semibold">{teacherName}:</p>
                                                        {assignedLessons.length > 0 ? (
                                                            <ul className="list-disc list-inside pl-3 text-gray-600">
                                                                {assignedLessons.map(l => (
                                                                    <li key={l.lessonId}>
                                                                        {l.lessonName}
                                                                        <span className="text-xs text-gray-500 ml-1">
                                                                            (Dal: {l.dalName || 'N/A'}, Sınıf: {l.sinifSeviyesi !== undefined ? l.sinifSeviyesi : 'N/A'})
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-gray-500 italic pl-3">Bu öğretmen için zorunlu ders (atanmış) bulunmuyor.</p>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 italic col-span-3">Seçili öğretmenler için zorunlu ders (atanmış) bulunmamaktadır.</p>
                                            )
                                        )}
                                    </div>
                                )}
                            </dl>
                        </div>
                    )}

                    {/* Display Dal Lessons - Grouped */} 
                    {selectedDalIds.length > 0 && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center mb-4">
                                <BookOpenIcon className="h-6 w-6 text-indigo-600 mr-3" />
                                <h3 className="text-xl font-semibold text-gray-800">Seçilen Dallar ve Dersleri</h3>
                            </div>
                            {isLoadingDalLessons && <p className="text-sm text-gray-500">Dersler yükleniyor...</p>}
                            {errorDalLessons && <p className="text-sm text-red-600">Dersler yüklenemedi: {errorDalLessons.message}</p>}
                            {!isLoadingDalLessons && lessonsGroupedByDal.length === 0 && <p className="text-sm text-yellow-600">Seçilen dallar için ders bulunamadı.</p>}
                            
                            {lessonsGroupedByDal.map(group => (
                                <div key={group.dalId} className="mb-6 last:mb-0">
                                    <h4 className="text-lg font-semibold text-indigo-700 mb-2 pb-1 border-b border-indigo-200">{group.dalName}</h4>
                                    {group.lessons.length > 0 ? (
                                        <ul className="space-y-2 text-sm text-gray-700">
                                            {group.lessons.map(lesson => (
                                                <li key={lesson.id} className="p-2 border rounded-md hover:bg-gray-50">
                                                    <div className="font-medium">{lesson.dersAdi} <span className="text-xs text-gray-500">({lesson.haftalikSaat} saat) - Sınıf: {lesson.sinifSeviyesi}</span></div>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1">
                                                        {lesson.bolunebilir_mi && 
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                                                <CheckCircleIcon className="h-3 w-3 mr-1" /> Bölünebilir
                                                            </span>}
                                                        {!lesson.bolunebilir_mi && 
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                                                <XCircleIcon className="h-3 w-3 mr-1" /> Bölünemez
                                                            </span>}
                                                        {lesson.cizelgeye_dahil_et && 
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                                <CheckCircleIcon className="h-3 w-3 mr-1" /> Otomatik Çizelgele
                                                            </span>}
                                                        {!lesson.cizelgeye_dahil_et && 
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                                <XCircleIcon className="h-3 w-3 mr-1" /> Otomatik Çizelgeleme Dışı
                                                            </span>}
                                                        {lesson.requires_multiple_resources && 
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                                                <ExclamationTriangleIcon className="h-3 w-3 mr-1" /> Çoklu Kaynak
                                                            </span>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Bu dal için listelenecek ders bulunamadı.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Display Teacher Unavailability */} 
                    {selectedTeacherIds.length > 0 && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Seçilen Öğretmenlerin Müsait Olmama Zamanları</h3>
                            {isLoadingTeacherUnavailability && <p className="text-sm text-gray-500">Müsait olmama zamanları yükleniyor...</p>}
                            {errorTeacherUnavailability && <p className="text-sm text-red-600">Müsait olmama zamanları yüklenemedi: {errorTeacherUnavailability.message}</p>}
                            {!isLoadingTeacherUnavailability && teacherUnavailability.length === 0 && <p className="text-sm text-yellow-600">Seçilen öğretmenler için müsait olmama zamanı tanımlanmamış.</p>}
                            {!isLoadingTeacherUnavailability && teacherUnavailability.length > 0 && (
                                <div className="space-y-3">
                                    {selectedTeacherIds.map(teacherId => {
                                        const unavsForTeacher = teacherUnavailability.filter(unav => unav.teacher_id === teacherId);
                                        const teacherInfo = semesterTeachers.find(t => t.id === teacherId);
                                        if (unavsForTeacher.length === 0) return null; 

                                        return (
                                            <div key={teacherId}>
                                                <h4 className="text-md font-medium text-gray-700">{teacherInfo?.name || `Öğretmen ID: ${teacherId}`}</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-1">
                                                    {unavsForTeacher.map(unav => (
                                                        <li key={unav.id}>
                                                            {dayNumberMap[unav.day_of_week] || 'Bilinmeyen Gün'}: {unav.start_period}. ders saati - {unav.end_period}. ders saati
                                                            {unav.reason && <span className="text-xs italic"> ({unav.reason})</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                     {teacherUnavailability.length === 0 && selectedTeacherIds.length > 0 && 
                                        !isLoadingTeacherUnavailability && 
                                        <p className="text-sm text-yellow-600 italic">Seçili öğretmenler için tanımlanmış müsait olmama periyodu bulunmuyor.</p> }
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ders Dağıtımı Button */} 
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
                <Button 
                    onClick={handleStartDistribution}
                    disabled={!canStartDistribution || isLoadingBranches || isLoadingDallar || isLoadingSemesterTeachers || isLoadingDalLessons || isLoadingTeacherUnavailability || isLoadingLocations || isLoadingCompulsoryAssignments || runSchedulerMutation.isLoading}
                    className="w-auto px-10 py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-60"
                >
                    {runSchedulerMutation.isLoading ? 'Dağıtım Yapılıyor...' : 'Ders Dağıtımını Başlat'}
                </Button>
            </div>

            {/* Timetable Results Display */}
            {showTimetable && generatedTimetable && (
                <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Ders Programı</h2>
                    
                    {/* Add 12th grade days visualization */}
                    {generatedTimetable.grade12DaysByDal && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                            <h3 className="font-medium text-gray-700 mb-2">12. Sınıf Dal Bazlı Okul Günleri</h3>
                            
                            {Object.entries(generatedTimetable.grade12DaysByDal).map(([dalId, days]) => {
                                // Find dal name from dallar list
                                const dalName = dallar.find(d => d.id === dalId)?.name || `Dal ${dalId}`;
                                
                                return (
                                    <div key={dalId} className="mb-2 last:mb-0">
                                        <div className="flex items-center flex-wrap mb-1">
                                            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-medium mr-2 mb-1">
                                                {dalName}
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                                {Array.isArray(days) && days.map((day: number) => (
                                                    <span key={day} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium mb-1">
                                                        {dayNumberMap[day]}
                                                    </span>
                                                ))}
                                            </div>
            </div>
                                    </div>
                                );
                            })}
                            
                            <p className="text-xs text-gray-600 mt-2">
                                12. sınıf dersleri dal bazında, yalnızca belirlenen günlerde programlanmaktadır.
                            </p>
                        </div>
                    )}
                    
                    {/* Add scheduling statistics */}
                    {generatedTimetable.schedulingStats && (
                        <div className="mb-6 p-3 bg-gray-50 rounded-md">
                            <h3 className="font-medium text-gray-700 mb-2">Ders Yükü İstatistikleri</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-2 rounded text-center">
                                    <div className="text-sm text-gray-500">En Az Ders Saati</div>
                                    <div className="text-xl font-bold text-blue-700">{generatedTimetable.schedulingStats.min}</div>
                                </div>
                                <div className="bg-blue-50 p-2 rounded text-center">
                                    <div className="text-sm text-gray-500">En Çok Ders Saati</div>
                                    <div className="text-xl font-bold text-blue-700">{generatedTimetable.schedulingStats.max}</div>
                                </div>
                                <div className="bg-blue-50 p-2 rounded text-center">
                                    <div className="text-sm text-gray-500">Ortalama Sapma</div>
                                    <div className="text-xl font-bold text-blue-700">{generatedTimetable.schedulingStats.avgDeviation.toFixed(1)}</div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Not: Düşük sapma değeri daha dengeli bir dağıtım anlamına gelir.</p>
                        </div>
                    )}
                    
                    {/* Tabs for different views */}
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                className="border-indigo-500 text-indigo-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                                onClick={() => {}}
                            >
                                Öğretmen Programları
                            </button>
                            <button
                                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                                onClick={() => {}}
                            >
                                Sınıf Programları
                            </button>
                        </nav>
                    </div>
                    
                    {/* Teacher Schedules */}
                    <div className="space-y-6">
                        {Object.keys(generatedTimetable.teacherSchedules).map(teacherId => {
                            const teacherName = semesterTeachers.find(t => t.id === teacherId)?.name || `Öğretmen ${teacherId}`;
                            const teacherSchedule = generatedTimetable.teacherSchedules[teacherId];
                            const totalHours = generatedTimetable.teacherTotalHours?.[teacherId] || 0;
                            const freeDays = generatedTimetable.teacherFreeDays?.[teacherId] || [];
                            
                            return (
                                <div key={teacherId} className="bg-gray-50 p-3 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                        {teacherName} 
                                        <span className="ml-2 text-sm bg-indigo-100 text-indigo-800 py-1 px-2 rounded-full">
                                            {totalHours} saat
                                        </span>
                                        {freeDays.length > 0 && (
                                            <span className="ml-2 text-sm bg-green-100 text-green-800 py-1 px-2 rounded-full">
                                                Boş: {freeDays.join(', ')}
                                            </span>
                                        )}
                                        {freeDays.length === 0 && (
                                            <span className="ml-2 text-sm bg-red-100 text-red-800 py-1 px-2 rounded-full">
                                                Boş gün yok
                                            </span>
                                        )}
                                    </h3>
                                    
                                    <div className="overflow-x-auto timetable-container">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm table-fixed">
                                            <colgroup>
                                                <col className="w-[10%]" /> {/* Hours column */}
                                                <col className="w-[18%]" /> {/* Monday */}
                                                <col className="w-[18%]" /> {/* Tuesday */}
                                                <col className="w-[18%]" /> {/* Wednesday */}
                                                <col className="w-[18%]" /> {/* Thursday */}
                                                <col className="w-[18%]" /> {/* Friday */}
                                            </colgroup>
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Saat
                                                    </th>
                                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Pzt
                                                    </th>
                                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Sal
                                                    </th>
                                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Çar
                                                    </th>
                                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Per
                                                    </th>
                                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Cum
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {Array.from({length: 10}, (_, i) => i + 1).map(period => (
                                                    <tr key={period} className={period % 2 === 0 ? 'bg-gray-50' : ''}>
                                                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                                            {period}.
                                                        </td>
                                                        {[1, 2, 3, 4, 5].map(day => {
                                                            const slot = teacherSchedule[day][period];
                                                            return (
                                                                <td key={day} className="px-3 py-2 whitespace-nowrap text-xs">
                                                                    {slot ? (
                                                                        <div 
                                                                            className={`p-1 rounded border overflow-hidden ${
                                                                                slot.isMultiResource 
                                                                                    ? 'border-yellow-300' 
                                                                                    : slot.isSplit 
                                                                                        ? 'border-green-300' 
                                                                                        : slot.isConsecutive
                                                                                            ? 'border-blue-300'
                                                                                            : 'border-gray-200'
                                                                            }`} 
                                                                            style={{ 
                                                                                backgroundColor: slot.color || (
                                                                                    slot.isMultiResource 
                                                                                        ? '#FEF9C3' // yellow-100 
                                                                                        : slot.isSplit 
                                                                                            ? '#DCFCE7' // green-100
                                                                                            : slot.isConsecutive
                                                                                                ? '#DBEAFE' // blue-100
                                                                                                : getLessonColor(slot.lessonId)
                                                                                ) 
                                                                            }}
                                                                        >
                                                                            <div className="font-medium text-gray-800 text-xs truncate" title={slot.lessonName}>{slot.lessonName}</div>
                                                                            <div className="text-xxs text-gray-500 truncate" title={slot.locationName}>
                                                                                {slot.locationName}
                                                                            </div>
                                                                            {slot.isMultiResource && (
                                                                                <div className="mt-1 pt-1 border-t border-yellow-200 text-xxs">
                                                                                    <div className="font-medium text-yellow-800 truncate">Çoklu Kaynak</div>
                                                                                </div>
                                                                            )}
                                                                            {slot.isSplit && (
                                                                                <div className="mt-1 pt-1 border-t border-green-200 text-xxs">
                                                                                    <div className="font-medium text-green-800 truncate">
                                                                                        Bölünmüş: {slot.splitGroup}/2
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {slot.isConsecutive && (
                                                                                <div className="mt-1 pt-1 border-t border-blue-200 text-xxs">
                                                                                    <div className="font-medium text-blue-800 truncate">
                                                                                        Blok Ders: {slot.totalConsecutiveHours} saat
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : '-'}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Unassigned Lessons - Make more prominent */}
                    {generatedTimetable.unassignedLessons && generatedTimetable.unassignedLessons.length > 0 && (
                        <div className="mt-10 border-t pt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                                <h3 className="text-xl font-semibold text-red-800">Atanamayan Dersler ({generatedTimetable.unassignedLessons.length})</h3>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <p className="text-red-700 mb-3">Aşağıdaki dersler, uygun zaman dilimi veya kaynak bulunamadığı için programda atanamamıştır:</p>
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-red-200">
                                        <thead className="bg-red-100">
                                            <tr>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Ders Adı</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Saat</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Dal</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Sınıf</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Özellikler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-red-100">
                                            {generatedTimetable.unassignedLessons.map(lesson => (
                                                <tr key={lesson.id} className="hover:bg-red-50">
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-red-800">{lesson.dersAdi}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-red-700">{lesson.haftalikSaat} saat</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-red-700">
                                                        {dallar.find(d => d.id === lesson.dalId)?.name || 'Bilinmeyen Dal'}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-red-700">{lesson.sinifSeviyesi}. Sınıf</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600">
                                                        <div className="flex flex-wrap gap-1">
                                                            {lesson.bolunebilir_mi === false && 
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">
                                                                    Blok Ders
                                                                </span>
                                                            }
                                                            {lesson.requires_multiple_resources === true && 
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                                                                    Çoklu Kaynak
                                                                </span>
                                                            }
                                                            {lesson.sinifSeviyesi === 12 && 
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                                                                    12. Sınıf
                                                                </span>
                                                            }
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 text-sm text-red-600">
                                    Bu dersleri manuel olarak programlayabilir veya ders dağıtımını farklı parametrelerle tekrar çalıştırabilirsiniz.
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Excluded Lessons - Enhanced display */}
                    {generatedTimetable.excludedLessons && generatedTimetable.excludedLessons.length > 0 && (
                        <div className="mt-10 border-t pt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardDocumentCheckIcon className="w-6 h-6 text-gray-500" />
                                <h3 className="text-xl font-semibold text-gray-800">Otomatik Çizelgeleme Dışı Dersler ({generatedTimetable.excludedLessons.length})</h3>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-gray-700 mb-3">Aşağıdaki dersler, cizelgeye_dahil_et=false olarak işaretlendiği için otomatik programlamaya dahil edilmemiştir:</p>
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ders Adı</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Saat</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Dal</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sınıf</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Özellikler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {generatedTimetable.excludedLessons.map(lesson => (
                                                <tr key={lesson.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{lesson.dersAdi}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{lesson.haftalikSaat} saat</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                        {dallar.find(d => d.id === lesson.dalId)?.name || 'Bilinmeyen Dal'}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{lesson.sinifSeviyesi}. Sınıf</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                                                        <div className="flex flex-wrap gap-1">
                                                            {lesson.bolunebilir_mi === false && 
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                                                                    Blok Ders
                                                                </span>
                                                            }
                                                            {lesson.requires_multiple_resources === true && 
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                                                                    Çoklu Kaynak
                                                                </span>
                                                            }
                                                            {lesson.sinifSeviyesi === 12 && 
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs">
                                                                    12. Sınıf
                                                                </span>
                                                            }
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 text-sm text-gray-600">
                                    Bu dersler manuel olarak programlanacak şekilde ayarlanmıştır.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 