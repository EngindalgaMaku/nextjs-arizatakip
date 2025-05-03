'use server';

import {
    SchedulerInput,
    SchedulerResult,
    Schedule,
    ScheduledEntry,
    TimeSlot,
    LessonScheduleData,
    TeacherScheduleData,
    LocationScheduleData,
    DayOfWeek,
    HourOfDay
} from '@/types/scheduling';

// --- Helper Functions ---

// Fisher-Yates (aka Knuth) Shuffle Algorithm
function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

/** Zaman dilimini string key'e çevirir (Map için) */
function getTimeSlotKey(slot: TimeSlot): string {
    return `${slot.day}-${slot.hour}`;
}

/** Schedule Map için anahtar oluşturur (Konum dahil) */
function getScheduleMapKey(slot: TimeSlot, locationId: string): string {
    return `${slot.day}-${slot.hour}-${locationId}`;
}

/** Belirli bir zamanda öğretmenin müsait olup olmadığını kontrol eder (Doğru Mantık) */
function isTeacherAvailable(teacher: TeacherScheduleData, slot: TimeSlot, schedule: Schedule): boolean {
    // 1. Öğretmenin genel müsaitiyetsizliği var mı?
    if (teacher.unavailableSlots.some(unav => unav.day === slot.day && unav.hour === slot.hour)) {
        // console.log(`[Scheduler Check] Teacher ${teacher.name} unavailable due to general unavailability at ${slot.day}-${slot.hour}`);
        return false;
    }
    // 2. Öğretmen o saatte zaten başka bir derse atanmış mı?
    for (const entry of schedule.values()) {
        if (entry.teacherId === teacher.id && entry.timeSlot.day === slot.day && entry.timeSlot.hour === slot.hour) {
            // console.log(`[Scheduler Check] Teacher ${teacher.name} unavailable due to assignment to ${entry.lessonName} at ${slot.day}-${slot.hour}`);
            return false;
        }
    }
    return true;
}

/** Belirli bir zamanda konumun müsait olup olmadığını kontrol eder (Yeni Anahtar ile Basitleştirildi) */
function isLocationAvailable(locationId: string, slot: TimeSlot, schedule: Schedule): boolean {
    const key = getScheduleMapKey(slot, locationId);
    // O saatte ve o konumda ders var mı? Varsa dolu.
    return !schedule.has(key); 
}

/** Belirli bir zamanda sınıfın (Dal+Seviye) müsait olup olmadığını kontrol eder (Doğru Mantık) */
function isClassAvailable(dalId: string, sinifSeviyesi: number, slot: TimeSlot, schedule: Schedule, lessonsMap: Map<string, LessonScheduleData>): boolean {
     // O saatte aynı sınıf grubunun (dal+seviye) başka bir dersi var mı?
    for (const entry of schedule.values()) {
        // Önce zaman dilimi eşleşiyor mu kontrol et
        if (entry.timeSlot.day === slot.day && entry.timeSlot.hour === slot.hour) {
            // Sonra bu entry'nin dersini bul
            const scheduledLesson = lessonsMap.get(entry.lessonId);
            // Eğer ders bulunduysa ve dal+seviye eşleşiyorsa, sınıf meşgul demektir
            if (scheduledLesson && scheduledLesson.dalId === dalId && scheduledLesson.sinifSeviyesi === sinifSeviyesi) {
                 // console.log(`[Scheduler Check] Class (Dal: ${dalId}, Seviye: ${sinifSeviyesi}) unavailable due to assignment to ${entry.lessonName} at ${slot.day}-${slot.hour}`);
                 return false;
            }
        }
    }
    return true;
}

/** Konumun ders için uygun olup olmadığını kontrol eder (Lab Tipi) */
function isLocationSuitable(lesson: LessonScheduleData, location: LocationScheduleData): boolean {
    if (lesson.suitableLabTypeIds.length === 0) {
        // Lab gerektirmeyen dersler sadece lab olmayan konumlara mı atanmalı?
        // Şimdilik lab olmayanlara atansın diyelim:
        return location.labTypeId === null;
    }
    return location.labTypeId !== null && lesson.suitableLabTypeIds.includes(location.labTypeId);
}

// --- YENİ: İkili Kaynak Uygunluk Kontrolü ---
function areSlotsAvailableForDual(
    lesson: LessonScheduleData,
    teacherA: TeacherScheduleData,
    locationA: LocationScheduleData,
    teacherB: TeacherScheduleData,
    locationB: LocationScheduleData,
    startSlot: TimeSlot,
    duration: number,
    input: SchedulerInput,
    checkDifferentDayForSecondHalf: boolean // Mevcut kontrolü buraya da taşıyalım
): TimeSlot[] | null {
    const consecutiveSlots: TimeSlot[] = [];
    const hoursPerDay = 10; 

    // Farklı Gün Kuralı Kontrolü (5+ saatlik derslerin 2. yarısı için)
    if (checkDifferentDayForSecondHalf) {
        let firstHalfDay: DayOfWeek | null = null;
        for (const entry of currentSchedule.values()) {
            if (entry.lessonId === lesson.id) {
                firstHalfDay = entry.timeSlot.day;
                break; // İlk parçayı bulduk, yeterli
            }
        }
        // Eğer ilk parça bulunduysa ve atamaya çalıştığımız gün ile aynıysa, uygun değil.
        if (firstHalfDay !== null && firstHalfDay === startSlot.day) {
            debugLogs.push(`[Constraint FAIL DiffDay Dual ${startSlot.day}-${startSlot.hour}] Cannot assign second half of ${lesson.name} (>5h) on the same day as the first half (${firstHalfDay}).`);
            return null;
        }
    }

    // Her saat için tüm kaynakların uygunluğunu kontrol et
    for (let i = 0; i < duration; i++) {
        const currentHour = (startSlot.hour + i) as HourOfDay;
        if (currentHour > hoursPerDay) {
             debugLogs.push(`[Slot FAIL Dual ${startSlot.day}-${currentHour}] Exceeds hoursPerDay for lesson ${lesson.name}`);
             return null; 
        }
        const currentSlot: TimeSlot = { day: startSlot.day, hour: currentHour };

        // Öğretmen A Müsait mi?
        if (!isTeacherAvailable(teacherA, currentSlot, currentSchedule)) {
            debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Teacher A (${teacherA.name}) unavailable for ${lesson.name}.`);
            return null;
        }
        // Öğretmen B Müsait mi?
        if (!isTeacherAvailable(teacherB, currentSlot, currentSchedule)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Teacher B (${teacherB.name}) unavailable for ${lesson.name}.`);
            return null;
        }
         // Konum A Müsait mi?
        if (!isLocationAvailable(locationA.id, currentSlot, currentSchedule)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Location A (${locationA.name}) unavailable for ${lesson.name}.`);
            return null;
        }
         // Konum B Müsait mi?
        if (!isLocationAvailable(locationB.id, currentSlot, currentSchedule)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Location B (${locationB.name}) unavailable for ${lesson.name}.`);
            return null;
        }
        // Sınıf Müsait mi? (Sınıf hala tek)
        if (!isClassAvailable(lesson.dalId, lesson.sinifSeviyesi, currentSlot, currentSchedule, lessonsDataMap)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Class (Dal ${lesson.dalId} Seviye ${lesson.sinifSeviyesi}) unavailable for ${lesson.name}.`);
            return null; 
        }
        
        consecutiveSlots.push(currentSlot);
    }
    // Tüm kontroller tüm saatler için başarılı olduysa
    debugLogs.push(`[Slots OK Dual ${startSlot.day}-${startSlot.hour} Dur:${duration}] All resources available for ${lesson.name}.`);
    return consecutiveSlots;
}

// --- YENİ: İkili Kaynak Atama Yardımcısı ---
function tryAssigningDualLesson(
    lessonIndex: number,
    currentLesson: LessonScheduleData,
    input: SchedulerInput,
    slot: TimeSlot,
    possibleTeachers: TeacherScheduleData[],
    possibleLocations: LocationScheduleData[]
): boolean {
    const teachersShuffled = shuffleArray([...possibleTeachers]);
    const locationsShuffled = shuffleArray([...possibleLocations]);

    for (let i = 0; i < teachersShuffled.length; i++) {
        const teacherA = teachersShuffled[i];
        for (let j = i + 1; j < teachersShuffled.length; j++) {
            const teacherB = teachersShuffled[j];
            for (let k = 0; k < locationsShuffled.length; k++) {
                const locationA = locationsShuffled[k];
                for (let l = k + 1; l < locationsShuffled.length; l++) {
                    const locationB = locationsShuffled[l];

                    // Süreleri belirle (GLOBAL remainingHours.get ile)
                    const currentRemainingForDurLogic = remainingHours.get(currentLesson.id) || 0;
                    let durationsToAttempt: number[] = [];
                    const totalHours = currentLesson.weeklyHours;
                    if (!currentLesson.canSplit) {
                        if (currentRemainingForDurLogic > 0) {
                            durationsToAttempt = [currentRemainingForDurLogic];
                        }
                    } else {
                        if (totalHours > 3) {
                            const targetDur1 = Math.ceil(totalHours / 2);
                            const targetDur2 = Math.floor(totalHours / 2);
                            if (currentRemainingForDurLogic === totalHours) {
                                if (targetDur1 > 0) durationsToAttempt = [targetDur1];
                            } else if (currentRemainingForDurLogic === targetDur2) {
                                if (targetDur2 > 0) durationsToAttempt = [targetDur2];
                            } else if (currentRemainingForDurLogic === targetDur1 && targetDur1 !== targetDur2) {
                                if (targetDur1 > 0) durationsToAttempt = [targetDur1];
                            }
                        } else {
                            if (currentRemainingForDurLogic === 3) durationsToAttempt.push(3);
                            if (currentRemainingForDurLogic >= 2 && !durationsToAttempt.includes(2)) durationsToAttempt.push(2);
                            if (currentRemainingForDurLogic >= 1 && !durationsToAttempt.includes(1)) durationsToAttempt.push(1);
                        }
                    }
                    // --- Süre belirleme sonu ---

                    for (const duration of durationsToAttempt) {
                        // Güncel kalanı tekrar OKU
                        const currentRemaining = remainingHours.get(currentLesson.id) || 0;
                        if (currentRemaining < duration) continue;

                        debugLogs.push(`[Try Dur ${duration} Dual ${slot.day}-${slot.hour}] For ${currentLesson.name} (Rem: ${currentRemaining}h) ...`);

                        // checkDifferentDay hesapla (currentRemaining kullanır)
                        const checkDifferentDay = totalHours > 5 && currentRemaining === Math.floor(totalHours / 2);
                        const consecutiveSlots = areSlotsAvailableForDual(
                            currentLesson, teacherA, locationA, teacherB, locationB,
                            slot, duration, input, checkDifferentDay
                        );

                        if (consecutiveSlots) {
                            // Atama yap
                            const previousRemaining = remainingHours.get(currentLesson.id) || 0; // GLOBAL'den al
                            debugLogs.push(`[Assign OK Dual ${slot.day}-${slot.hour} Dur:${duration}] ...`);
                            const assignedKeys: string[] = [];
                            consecutiveSlots.forEach(assignedSlot => {
                                const keyA = getScheduleMapKey(assignedSlot, locationA.id);
                                currentSchedule.set(keyA, {
                                    lessonId: currentLesson.id, lessonName: currentLesson.name,
                                    teacherId: teacherA.id, teacherName: teacherA.name,
                                    locationId: locationA.id, locationName: locationA.name,
                                    timeSlot: assignedSlot, dalId: currentLesson.dalId,
                                    sinifSeviyesi: currentLesson.sinifSeviyesi
                                });
                                assignedKeys.push(keyA);
                                const keyB = getScheduleMapKey(assignedSlot, locationB.id);
                                currentSchedule.set(keyB, {
                                    lessonId: currentLesson.id, lessonName: currentLesson.name,
                                    teacherId: teacherB.id, teacherName: teacherB.name,
                                    locationId: locationB.id, locationName: locationB.name,
                                    timeSlot: assignedSlot, dalId: currentLesson.dalId,
                                    sinifSeviyesi: currentLesson.sinifSeviyesi
                                });
                                assignedKeys.push(keyB);
                            });

                            // GLOBAL map'i GÜNCELLE
                            remainingHours.set(currentLesson.id, previousRemaining - duration);

                            // Özyineleme (GLOBAL map'i okuyarak karar ver)
                            let solved = false;
                            const newRemaining = remainingHours.get(currentLesson.id) || 0;
                            if (newRemaining <= 0) {
                                solved = solveRecursive(lessonIndex + 1, input);
                            } else {
                                solved = solveRecursive(lessonIndex, input);
                            }

                            if (solved) return true;

                            // Geri al
                            debugLogs.push(`[Backtrack Dual ${slot.day}-${slot.hour} Dur:${duration}] ...`);
                            assignedKeys.forEach(key => currentSchedule.delete(key));
                            // GLOBAL map'i GERİ YÜKLE
                            remainingHours.set(currentLesson.id, previousRemaining);
                        }
                    }
                }
            }
        }
    }
    return false;
}

// --- Main Scheduling Logic (Backtracking) ---

// State'ler
let currentSchedule: Schedule;
let remainingHours: Map<string, number>; 
let lessonsDataMap: Map<string, LessonScheduleData>;
let teachersDataMap: Map<string, TeacherScheduleData>;
let locationsDataMap: Map<string, LocationScheduleData>;
let allLessons: LessonScheduleData[];
let allTimeSlots: TimeSlot[];
let requiredAssignments: Map<string, Set<string>>;
let debugLogs: string[]; // <<< YENİ: Logları toplamak için dizi

/**
 * Belirtilen başlangıç saatinden itibaren ardışık saatlerin
 * ders, öğretmen, konum ve sınıf için uygun olup olmadığını kontrol eder.
 */
function areConsecutiveSlotsAvailable(
    lesson: LessonScheduleData,
    teacher: TeacherScheduleData,
    location: LocationScheduleData,
    startSlot: TimeSlot,
    duration: number,
    input: SchedulerInput,
    checkDifferentDayForSecondHalf: boolean
): TimeSlot[] | null {
    const consecutiveSlots: TimeSlot[] = [];
    const hoursPerDay = 10;

    // Farklı Gün Kuralı Kontrolü (5+ saatlik derslerin 2. yarısı için)
    if (checkDifferentDayForSecondHalf) {
        let firstHalfDay: DayOfWeek | null = null;
        for (const entry of currentSchedule.values()) {
            if (entry.lessonId === lesson.id) {
                firstHalfDay = entry.timeSlot.day;
                break; // İlk parçayı bulduk, yeterli
            }
        }
        // Eğer ilk parça bulunduysa ve atamaya çalıştığımız gün ile aynıysa, uygun değil.
        if (firstHalfDay !== null && firstHalfDay === startSlot.day) {
            debugLogs.push(`[Constraint FAIL DiffDay ${startSlot.day}-${startSlot.hour}] Cannot assign second half of ${lesson.name} (>5h) on the same day as the first half (${firstHalfDay}).`);
            return null;
        }
    }

    // Her saat için tüm kaynakların uygunluğunu kontrol et
    for (let i = 0; i < duration; i++) {
        const currentHour = (startSlot.hour + i) as HourOfDay;
        if (currentHour > hoursPerDay) {
             // Daha detaylı log
             debugLogs.push(`[Slot FAIL Hours ${startSlot.day}-${startSlot.hour} Dur:${duration}] Hour ${currentHour} exceeds hoursPerDay (${hoursPerDay}) for lesson ${lesson.name}.`);
             return null;
        }
        const currentSlot: TimeSlot = { day: startSlot.day, hour: currentHour };

        // --- YENİ Detaylı Loglar ---
        const teacherAvailable = isTeacherAvailable(teacher, currentSlot, currentSchedule);
        if (!teacherAvailable) {
             debugLogs.push(`[Slot FAIL Teacher ${currentSlot.day}-${currentSlot.hour}] Teacher ${teacher.name} unavailable for lesson ${lesson.name}.`);
             return null;
        }

        const locationAvailable = isLocationAvailable(location.id, currentSlot, currentSchedule);
        if (!locationAvailable) {
             debugLogs.push(`[Slot FAIL Location ${currentSlot.day}-${currentSlot.hour}] Location ${location.name} unavailable for lesson ${lesson.name}.`);
            return null;
        }

        const classAvailable = isClassAvailable(lesson.dalId, lesson.sinifSeviyesi, currentSlot, currentSchedule, lessonsDataMap);
        if (!classAvailable) {
             debugLogs.push(`[Slot FAIL Class ${currentSlot.day}-${currentSlot.hour}] Class (Dal: ${lesson.dalId}, Seviye: ${lesson.sinifSeviyesi}) unavailable for lesson ${lesson.name}.`);
            return null;
        }
        // --- Log Sonu ---

        consecutiveSlots.push(currentSlot);
    }
    // Başarılı olursa log ekleyelim (Opsiyonel)
    // debugLogs.push(`[Slots OK ${startSlot.day}-${startSlot.hour} Dur:${duration}] Slots available for ${lesson.name} with ${teacher.name} at ${location.name}`);
    return consecutiveSlots;
}

/** Backtracking algoritmasının çekirdek fonksiyonu */
function solveRecursive(lessonIndex: number, input: SchedulerInput): boolean {
    // --- YENİ LOG: Fonksiyon Girişi ---
    debugLogs.push(`[>>> solveRecursive ENTER] Lesson Index: ${lessonIndex}`);
    // --- LOG SONU ---

    if (lessonIndex >= allLessons.length) {
        debugLogs.push(`[<<< solveRecursive EXIT - SUCCESS] Base case reached.`); // Log base case success
        return true; // Base case: All lessons processed
    }

    const currentLesson = allLessons[lessonIndex];

    // --- YENİ LOG: Mevcut Ders Bilgisi ---
    debugLogs.push(`[DEBUG solveRecursive] Processing Lesson: ${currentLesson.name} (Index: ${lessonIndex})`);
    // --- LOG SONU ---

    // --- Kalan Saat Kontrolü (Döngü içinde yapılacak) ---
    // let initialRemainingHoursCheck = remainingHours.get(currentLesson.id) || 0;
    // if (initialRemainingHoursCheck <= 0 || !currentLesson.needsScheduling) {
    //     return solveRecursive(lessonIndex + 1, input);
    // }

    // --- Öğretmenleri ve Konumları Bul (Her iki yol için de gerekli) ---
    const possibleTeachers = currentLesson.possibleTeacherIds
        .map(id => teachersDataMap.get(id))
        .filter((t): t is TeacherScheduleData => !!t);

    const requiredTeachers: TeacherScheduleData[] = [];
    const otherTeachers: TeacherScheduleData[] = [];
    possibleTeachers.forEach(teacher => {
        if (requiredAssignments.get(teacher.id)?.has(currentLesson.id)) {
            requiredTeachers.push(teacher);
        } else {
            otherTeachers.push(teacher);
        }
    });

    // --- YENİ LOG: Zorunlu Öğretmen Kontrolü ---
    debugLogs.push(`[DEBUG ReqCheck] Lesson: ${currentLesson.name} (${currentLesson.id})`);
    if (requiredTeachers.length > 0) {
        debugLogs.push(` -> Required Teachers found: ${requiredTeachers.map(t => `${t.name} (${t.id})`).join(', ')}`);
    } else {
        debugLogs.push(` -> No Required Teachers according to map.`);
    }
    // debugLogs.push(` -> Other Possible Teachers: ${otherTeachers.map(t => `${t.name} (${t.id})`).join(', ')}`); // İsteğe bağlı: Diğerlerini de logla
    // --- LOG SONU ---

    // Find and shuffle locations (no prioritization needed here)
    const possibleLocations = (currentLesson.suitableLabTypeIds.length > 0
        ? input.locations.filter(loc =>
            loc.labTypeId !== null && currentLesson.suitableLabTypeIds.includes(loc.labTypeId)
          )
        : input.locations
    ).filter(loc => loc.capacity !== null && loc.capacity >= 0);

    // Gerekli kaynak sayısı kontrolü
    const minTeachersRequired = currentLesson.requiresMultipleResources ? 2 : 1;
    const minLocationsRequired = currentLesson.requiresMultipleResources ? 2 : 1;

    if (possibleTeachers.length < minTeachersRequired) {
        debugLogs.push(`[FAIL] Not enough possible teachers for ${currentLesson.name} (Req: ${minTeachersRequired}, Found: ${possibleTeachers.length})`);
        return solveRecursive(lessonIndex + 1, input);
    }
    if (possibleLocations.length < minLocationsRequired) {
        debugLogs.push(`[FAIL] Not enough possible locations for ${currentLesson.name} (Req: ${minLocationsRequired}, Found: ${possibleLocations.length})`);
        return solveRecursive(lessonIndex + 1, input);
    }

    const requiredTeachersShuffled = shuffleArray([...requiredTeachers]);
    const otherTeachersShuffled = shuffleArray([...otherTeachers]);
    const possibleLocationsShuffled = shuffleArray([...possibleLocations]);

    // --- Tekli Kaynak Atama Yardımcısı (Global Map Kullanacak Şekilde) --- //
    const tryAssigningWithTeachers = (teachersToTry: TeacherScheduleData[], slot: TimeSlot): boolean => {
        // --- YENİ LOG: Fonksiyon Girişi ---
         debugLogs.push(`[DEBUG tryAssign Start] Slot: ${slot.day}-${slot.hour}, Lesson: ${currentLesson.name}, Teachers to try: ${teachersToTry.length > 0 ? teachersToTry.map(t=>t.name).join('/') : 'NONE'}`);
         // --- LOG SONU ---

        for (const teacher of teachersToTry) {
             // --- YENİ LOG: Öğretmen Döngüsü ---
             debugLogs.push(`[DEBUG tryAssign Teacher Loop] Trying Teacher: ${teacher.name} for Slot: ${slot.day}-${slot.hour}, Lesson: ${currentLesson.name}`);
            // --- LOG SONU ---
            for (const location of possibleLocationsShuffled) {
                // İçerideki attemptAssignment global map kullanacak
                const attemptAssignment = (duration: number, currentTeacher: TeacherScheduleData): boolean => {
                    // --- YENİ LOG: attemptAssignment GİRİŞİ ---
                    debugLogs.push(`[DEBUG attemptAssign Entry ${slot.day}-${slot.hour} Dur:${duration}] For L:${currentLesson.name}, T:${currentTeacher.name}, Loc:${location.name}`);
                    // --- LOG SONU ---

                    const currentRemaining = remainingHours.get(currentLesson.id) || 0;
                    if (currentRemaining < duration) {
                         // --- YENİ LOG: Yetersiz Saat ---
                         debugLogs.push(`[DEBUG attemptAssign FAIL ${slot.day}-${slot.hour} Dur:${duration}] Not enough remaining hours (Rem: ${currentRemaining}h)`);
                         // --- LOG SONU ---
                         return false;
                    }

                    // --- YENİ: Tek Öğretmen Kuralı Kontrolü ---
                    if (!currentLesson.requiresMultipleResources) {
                        let existingTeacherId: string | null = null;
                        for(const entry of currentSchedule.values()) {
                            if (entry.lessonId === currentLesson.id) {
                                existingTeacherId = entry.teacherId;
                                break;
                            }
                        }
                        // Eğer ders önceden atanmışsa VE denenen öğretmen farklıysa, izin verme
                        if (existingTeacherId !== null && existingTeacherId !== currentTeacher.id) {
                            // --- YENİ Detaylı Log ---
                            const existingTeacherName = teachersDataMap.get(existingTeacherId)?.name ?? 'Bilinmeyen';
                            debugLogs.push(`[Constraint FAIL SameTeacher ${slot.day}-${slot.hour} Dur:${duration}] Lesson ${currentLesson.name} already assigned to ${existingTeacherName} (${existingTeacherId}). Cannot assign this part to ${currentTeacher.name} (${currentTeacher.id}).`);
                            // --- Log Sonu ---
                            return false;
                        }
                         // --- YENİ Başarılı Kontrol Logu ---
                        else if (existingTeacherId !== null /* && existingTeacherId === currentTeacher.id */) {
                            // Zaten existingTeacherId === currentTeacher.id durumu else if'e girmez,
                            // ama kontrolün geçtiğini belirtmek için log ekleyelim.
                            debugLogs.push(`[Constraint OK SameTeacher ${slot.day}-${slot.hour} Dur:${duration}] Lesson ${currentLesson.name} already assigned to ${currentTeacher.name}. Allowing attempt.`);
                        }
                         // --- Log Sonu ---
                        // else: existingTeacherId === null (ders ilk defa atanıyor) - kontrol gerekmez.
                    }
                    // --- Kontrol Sonu ---

                    // checkDifferentDay hesapla
                    const totalHoursCheck = currentLesson.weeklyHours;
                    const checkDifferentDay = totalHoursCheck > 5 && currentRemaining === Math.floor(totalHoursCheck / 2);

                    // --- YENİ LOG: areConsecutiveSlotsAvailable ÇAĞRISI ÖNCESİ ---
                    debugLogs.push(`[DEBUG Pre-ConsecCheck ${slot.day}-${slot.hour} Dur:${duration}] Calling areConsecutiveSlotsAvailable for L:${currentLesson.name}, T:${currentTeacher.name}, Loc:${location.name}, CheckDiffDay:${checkDifferentDay}`);
                    // --- LOG SONU ---

                    const consecutiveSlots = areConsecutiveSlotsAvailable(
                        currentLesson, currentTeacher, location, slot, duration, input,
                        checkDifferentDay
                    );

                     // --- YENİ LOG: areConsecutiveSlotsAvailable ÇAĞRISI SONRASI ---
                    debugLogs.push(`[DEBUG Post-ConsecCheck ${slot.day}-${slot.hour} Dur:${duration}] Result: ${consecutiveSlots ? `OK (${consecutiveSlots.length} slots)` : 'NULL'}`);
                    // --- LOG SONU ---


                    if (consecutiveSlots) {
                        // Max 2 öğretmen kontrolü (değişiklik yok)
                        const assignedTeachers = new Set<string>();
                        for (const entry of currentSchedule.values()) {
                            if (entry.lessonId === currentLesson.id) {
                                assignedTeachers.add(entry.teacherId);
                            }
                        }
                        const isNewTeacher = !assignedTeachers.has(currentTeacher.id);
                        const canAssignTeacher = !isNewTeacher || assignedTeachers.size < 2;

                        if (!canAssignTeacher) {
                            const assignedTeacherNames = Array.from(assignedTeachers).map(id => teachersDataMap.get(id)?.name ?? id).join(', ');
                            debugLogs.push(`[Constraint FAIL MaxTeachers ${slot.day}-${slot.hour} Dur:${duration}] Cannot assign ${currentTeacher.name} to ${currentLesson.name}. Already assigned to ${assignedTeachers.size} teachers: ${assignedTeacherNames}`);
                            return false;
                        }

                        // Atama (currentTeacher kullanılıyor)
                        const previousRemaining = remainingHours.get(currentLesson.id) || 0;
                        debugLogs.push(`[Assign OK ${slot.day}-${slot.hour} Dur:${duration}] L: ${currentLesson.name} to T: ${currentTeacher.name}...`);
                        consecutiveSlots.forEach(assignedSlot => {
                            const key = getScheduleMapKey(assignedSlot, location.id);
                            currentSchedule.set(key, {
                                lessonId: currentLesson.id, lessonName: currentLesson.name,
                                teacherId: currentTeacher.id,
                                teacherName: currentTeacher.name,
                                locationId: location.id, locationName: location.name,
                                timeSlot: assignedSlot, dalId: currentLesson.dalId,
                                sinifSeviyesi: currentLesson.sinifSeviyesi
                            });
                        });
                        remainingHours.set(currentLesson.id, previousRemaining - duration);

                        // Özyineleme ...
                        let solved = false;
                        const newRemaining = remainingHours.get(currentLesson.id) || 0;
                        if (newRemaining <= 0) { solved = solveRecursive(lessonIndex + 1, input); } else { solved = solveRecursive(lessonIndex, input); }

                        if (solved) return true;

                        // Geri al (currentTeacher logda belirtilebilir)
                        debugLogs.push(`[Backtrack ${slot.day}-${slot.hour} Dur:${duration}] Removing ${currentLesson.name} from T: ${currentTeacher.name}`);
                        consecutiveSlots.forEach(assignedSlot => {
                            const key = getScheduleMapKey(assignedSlot, location.id);
                            currentSchedule.delete(key);
                        });
                        remainingHours.set(currentLesson.id, previousRemaining);
                        return false;
                    }
                     // --- YENİ LOG: attemptAssignment Sonu (Başarısız) ---
                     else { // consecutiveSlots null ise buraya düşer
                         debugLogs.push(`[DEBUG attemptAssign FAIL ${slot.day}-${slot.hour} Dur:${duration}] Consecutive slots check failed.`);
                     }
                    // --- LOG SONU ---
                    return false; // Başarısız oldu (ya slot bulunamadı ya da özyinelemeden false döndü)
                }; // attemptAssignment sonu

                // Süreleri belirle ...
                const currentRemainingForDurLogic = remainingHours.get(currentLesson.id) || 0;
                let durationsToAttempt: number[] = [];
                const totalHours = currentLesson.weeklyHours;
                if (!currentLesson.canSplit) { if (currentRemainingForDurLogic > 0) { durationsToAttempt = [currentRemainingForDurLogic]; } }
                 else {
                     if (totalHours > 3) {
                         const targetDur1 = Math.ceil(totalHours / 2); // Size of the first chunk
                         const targetDur2 = Math.floor(totalHours / 2); // Size of the second chunk

                         // If the full duration is remaining, attempt to schedule the first chunk.
                         if (currentRemainingForDurLogic === totalHours && targetDur1 > 0) {
                             durationsToAttempt = [targetDur1];
                         }
                         // If the remaining duration exactly matches the size of the second chunk, attempt to schedule it.
                         // This handles the case after the first chunk (of size targetDur1) has been scheduled.
                         else if (currentRemainingForDurLogic === targetDur2 && targetDur2 > 0) {
                             durationsToAttempt = [targetDur2];
                         }
                         // If the remaining duration matches the first chunk size AND the chunks are different sizes (i.e., totalHours is odd),
                         // attempt to schedule the first chunk size. This might occur if scheduling attempts backtrack.
                         else if (currentRemainingForDurLogic === targetDur1 && targetDur1 !== targetDur2 && targetDur1 > 0) {
                             durationsToAttempt = [targetDur1];
                         }
                     } else { // totalHours <= 3
                         // Logic for smaller lessons (attempt 3, 2, or 1 hour blocks based on remaining)
                         if (currentRemainingForDurLogic === 3) durationsToAttempt.push(3);
                         // Use >= to allow trying smaller blocks even if more hours remain (e.g., try 2h block if 3h remain)
                         if (currentRemainingForDurLogic >= 2 && !durationsToAttempt.includes(2)) durationsToAttempt.push(2);
                         if (currentRemainingForDurLogic >= 1 && !durationsToAttempt.includes(1)) durationsToAttempt.push(1);
                         // Sort descending to try largest possible block first
                         durationsToAttempt.sort((a, b) => b - a);
                     }
                 }
                 // --- YENİ LOG: Hesaplanmış Süreler ---
                 debugLogs.push(`[DEBUG Durations ${slot.day}-${slot.hour}] For L:${currentLesson.name}, T:${teacher.name}, Loc:${location.name}. Calculated durationsToAttempt: [${durationsToAttempt.join(',')}] (Rem: ${currentRemainingForDurLogic}h, CanSplit: ${currentLesson.canSplit})`);
                 // --- LOG SONU ---


                // Belirlenen süreleri dene
                let success = false;
                for (const duration of durationsToAttempt) {
                    success = attemptAssignment(duration, teacher);
                    if (success) break;
                }

                if (success) return true;
            }
        }
         // --- YENİ LOG: Fonksiyon Sonu (Başarısız) ---
        debugLogs.push(`[DEBUG tryAssign End] Failed for all teacher/location pairs for Slot: ${slot.day}-${slot.hour}, Lesson: ${currentLesson.name}`);
        // --- LOG SONU ---
        return false;
    };
    // --- tryAssigningWithTeachers Sonu --- //

    // --- Slotları Döngüye Al ve Uygun Atama Fonksiyonunu Çağır --- //
    for (const slot of allTimeSlots) {
        // --- Döngü başında GÜNCEL Kalan Saati OKU --- //
        const currentRemainingHours = remainingHours.get(currentLesson.id) || 0;

        // --- Eğer dersin scheduling'i bitmişse veya saat kalmadıysa bu slotu/dersi atla --- //
        if (!currentLesson.needsScheduling || currentRemainingHours <= 0) {
            // Bu ders zaten başka bir recursive kolda bitirilmiş olabilir VEYA
            // اصلا scheduling dışı bırakılmış olabilir.
            // Eğer saat kalmadıysa, sonraki derse geçmek için solveRecursive(lessonIndex + 1, input) DÖNMEMELİYİZ,
            // çünkü bu, bu ders için tüm slotları denemeden bir sonraki derse atlar.
            // Sadece bu slotu atlamak yeterli.
            if (currentRemainingHours <= 0) {
                 // --- YENİ LOG: Ders Bitti/Saat Kalmadı ---
                 // debugLogs.push(`[DEBUG Slot ${slot.day}-${slot.hour}] Lesson ${currentLesson.name} already assigned (0 hours left). Skipping slot.`);
                 // --- LOG SONU ---
                continue; // Bu ders için saat kalmamış, bir sonraki slota geç
            }
            if (!currentLesson.needsScheduling) {
                 debugLogs.push(`[DEBUG Slot ${slot.day}-${slot.hour}] Lesson ${currentLesson.name} does not need scheduling. Skipping slot.`);
                 // Eğer bu ders hiç çizelgeye dahil edilmeyecekse, tüm slotları denemek yerine
                 // doğrudan bir sonraki derse geçmek daha verimli olabilir.
                 // Bu nedenle, bu kontrolü döngünün DIŞINA, en başa almak daha mantıklı.
                 // Şimdilik burada bırakalım, ama optimizasyon olarak not edelim.
                 continue;
            }
        }

        debugLogs.push(`[Try Slot ${slot.day}-${slot.hour}] For lesson: ${currentLesson.name} (Rem: ${currentRemainingHours}h, ReqDual: ${currentLesson.requiresMultipleResources})`);

        let solved = false;
        if (currentLesson.requiresMultipleResources) {
            // İKİLİ Kaynak Atamayı Dene (remainingHoursRef YOK)
            solved = tryAssigningDualLesson(
                lessonIndex, currentLesson, input, slot,
                possibleTeachers, possibleLocations
            );
        } else {
            // TEKLİ Kaynak Atamayı Dene
            // ... (mevcut zorunlu/diğer öğretmen mantığı) ...
             if (requiredTeachersShuffled.length > 0) {
                debugLogs.push(` -> Zorunlu öğretmen(ler) var (${requiredTeachersShuffled.map(t=>t.name).join(', ')}). Sadece onlar deneniyor.`);
                solved = tryAssigningWithTeachers(requiredTeachersShuffled, slot);
                if (!solved) debugLogs.push(` -> Zorunlu öğretmen(ler) ${slot.day}-${slot.hour} için atanamadı.`);
            } else {
                 debugLogs.push(` -> Zorunlu öğretmen yok. Diğer olası öğretmenler deneniyor.`);
                solved = tryAssigningWithTeachers(otherTeachersShuffled, slot);
                 if (!solved) debugLogs.push(` -> Diğer olası öğretmenler ${slot.day}-${slot.hour} için atanamadı.`);
            }
        }

        // --- YENİ LOG: Recursive Çağrı Öncesi/Sonrası ---
        if (solved) {
            debugLogs.push(`[DEBUG solveRecursive] Slot ${slot.day}-${slot.hour} assignment led to SUCCESS for lesson ${currentLesson.name}. Returning true.`);
            debugLogs.push(`[<<< solveRecursive EXIT - FOUND SLOT] Lesson Index: ${lessonIndex}`); // Log successful exit
            return true; // Found a valid assignment for this lesson branch
        } else {
            // debugLogs.push(`[DEBUG solveRecursive] Slot ${slot.day}-${slot.hour} did NOT lead to a solution for lesson ${currentLesson.name}. Trying next slot.`);
        }
        // --- LOG SONU ---
    }

    // --- YENİ LOG: Döngü Sonu (Başarısız) ---
    debugLogs.push(`[FAIL solveRecursive] All slots tried for Lesson ${currentLesson.name} (Index: ${lessonIndex}). Backtracking...`);
    debugLogs.push(`[<<< solveRecursive EXIT - FAILED] Lesson Index: ${lessonIndex}`); // Log failed exit
    // --- LOG SONU ---
    return false; // Bu ders için çözüm bulunamadı, geri izle
}

// --- Main Exported Function ---

export async function generateSchedule(input: SchedulerInput): Promise<SchedulerResult> {
    // --- Initialize Global State ---
    currentSchedule = new Map<string, ScheduledEntry>();
    remainingHours = new Map<string, number>();
    lessonsDataMap = new Map<string, LessonScheduleData>();
    teachersDataMap = new Map<string, TeacherScheduleData>();
    locationsDataMap = new Map<string, LocationScheduleData>();
    allLessons = [...input.lessons].sort((a, b) => b.weeklyHours - a.weeklyHours); // En çok saatli dersleri başa alalım
    allTimeSlots = [...input.timeSlots]; // Kopyasını alalım, shuffle edilebilir
    requiredAssignments = new Map(input.requiredAssignmentsMap); // Kopyasını alalım
    debugLogs = []; // Logları sıfırla

    // Initialize remaining hours
    allLessons.forEach(lesson => {
        if (lesson.needsScheduling) {
            remainingHours.set(lesson.id, lesson.weeklyHours);
        } else {
            remainingHours.set(lesson.id, 0); // Çizelgeye dahil edilmeyecekse 0 saat
        }
        lessonsDataMap.set(lesson.id, lesson);
    });

    // Initialize teacher and location maps
    input.teachers.forEach(teacher => teachersDataMap.set(teacher.id, teacher));
    input.locations.forEach(location => locationsDataMap.set(location.id, location));

    // --- Start the Recursive Solver ---
    debugLogs.push("--- Starting Scheduling Algorithm ---");
    debugLogs.push(`Total Lessons to Schedule: ${allLessons.filter(l => l.needsScheduling).length}`);
    debugLogs.push(`Total Time Slots Available: ${allTimeSlots.length}`);

    const startTime = performance.now();
    let success = false;
    try {
        success = solveRecursive(0, input);
    } catch (error: any) {
        console.error("Error during scheduling:", error);
        debugLogs.push(`[FATAL ERROR] ${error.message || 'Unknown error during solveRecursive'}`);
         return {
            success: false,
            schedule: new Map(), // Hata durumunda boş schedule
            logs: debugLogs,
            error: `Algoritma sırasında bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
        };
    }
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2); // saniye cinsinden

    debugLogs.push(`--- Scheduling Finished ---`);
    debugLogs.push(`Result: ${success ? 'Success' : 'Failed'}`);
    debugLogs.push(`Duration: ${duration} seconds`);

    // --- Prepare and Return Result ---
    const finalSchedule = success ? currentSchedule : new Map(); // Başarısızsa boş map döndür

    // (Optional) Final check: Verify remaining hours
    let allHoursAssigned = true;
    let unassignedLessons: string[] = [];
    remainingHours.forEach((hoursLeft, lessonId) => {
        const lesson = lessonsDataMap.get(lessonId);
        // Sadece çizelgeye dahil edilmesi gerekenleri kontrol et
        if (lesson?.needsScheduling && hoursLeft > 0) {
            allHoursAssigned = false;
            unassignedLessons.push(`${lesson.name} (${hoursLeft}h missing)`);
        }
    });

    if (success && !allHoursAssigned) {
         debugLogs.push(`[WARNING] Algorithm reported success, but some required hours are unassigned: ${unassignedLessons.join(', ')}`);
         // İsteğe bağlı: Başarıyı false yapabiliriz.
         // success = false;
         // finalSchedule = new Map();
    } else if (!success && allHoursAssigned) {
         // Bu durum beklenmez, ama loglamak iyi olabilir.
         debugLogs.push(`[WARNING] Algorithm reported failure, but all required hours seem assigned.`);
    }


    return {
        success: success && allHoursAssigned, // Başarı için hem algoritma başarılı olmalı hem de tüm saatler atanmış olmalı
        schedule: finalSchedule,
        logs: debugLogs,
        error: success ? undefined : "Çizelge oluşturulamadı. Tüm dersler uygun zaman dilimlerine yerleştirilemedi.",
    };
}