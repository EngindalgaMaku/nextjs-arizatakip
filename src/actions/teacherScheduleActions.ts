'use server'; // Mark as server actions

import { supabase } from '@/lib/supabase'; // Use the server client instance
import {
  TeacherScheduleEntrySchema,
  TeacherScheduleFormSchema,
  TeacherScheduleEntry,
  TeacherScheduleFormValues
} from '@/types/teacherSchedules';
import { z } from 'zod'; // Import z from zod
import { revalidatePath } from 'next/cache';

/**
 * Fetch the schedule for a specific teacher, joining with classes table.
 */
export async function fetchTeacherSchedule(teacherId: string): Promise<TeacherScheduleEntry[]> {
  if (!teacherId) return [];

  const { data, error } = await supabase
    .from('teacher_schedules')
    // Select all from schedules and the name from classes
    .select(`
      *,
      classes ( name )
    `)
    .eq('teacher_id', teacherId)
    .order('day_of_week', { ascending: true })
    .order('time_slot', { ascending: true });

  if (error) {
    console.error(`Error fetching schedule for teacher ${teacherId}:`, error);
    throw error;
  }

  // Map data to camelCase and extract class name
  const mappedData = data?.map(entry => ({
    id: entry.id,
    teacherId: entry.teacher_id,
    dayOfWeek: entry.day_of_week,
    timeSlot: entry.time_slot,
    className: entry.class_name, // Lesson name
    locationName: entry.location_name,
    classId: entry.class_id, // Class ID
    // Extract nested class name or null
    classNameDisplay: entry.classes ? entry.classes.name : null,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  })) || [];

  // Validate fetched data (optional but recommended)
  const parseResult = z.array(TeacherScheduleEntrySchema).safeParse(mappedData);
  if (!parseResult.success) {
      console.error('Fetched teacher schedule data validation failed:', parseResult.error);
      // Handle validation error, e.g., return empty array or throw
      return [];
  }

  return parseResult.data;
}

/**
 * Create a new schedule entry.
 */
export async function createTeacherScheduleEntry(
  teacherId: string,
  dayOfWeek: number,
  timeSlot: number,
  payload: TeacherScheduleFormValues
): Promise<{ success: boolean; entry?: TeacherScheduleEntry; error?: string }> {
  const parse = TeacherScheduleFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // *** Start: Location Conflict Check ***
  if (parse.data.locationName) {
    const { data: conflictingEntry, error: conflictError } = await supabase
      .from('teacher_schedules')
      .select('id') // We only need to know if one exists
      .eq('day_of_week', dayOfWeek)
      .eq('time_slot', timeSlot)
      .eq('location_name', parse.data.locationName)
      .maybeSingle(); // Check if any entry exists

    if (conflictError) {
      console.error('Error checking for location conflict during create:', conflictError);
      return { success: false, error: 'Konum uygunluğu kontrol edilirken bir hata oluştu.' };
    }

    if (conflictingEntry) {
      return { success: false, error: 'Bu konum/laboratuvar belirtilen saatte zaten kullanımda.' };
    }
  }
  // *** End: Location Conflict Check ***

  const entryData = {
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    time_slot: timeSlot,
    class_name: parse.data.className,
    location_name: parse.data.locationName || null,
    class_id: parse.data.classId || null, // Save classId (or null)
  };

  try {
    const { data, error } = await supabase
      .from('teacher_schedules')
      .insert(entryData)
      // Fetch the created entry with class name
      .select(`
        *,
        classes ( name )
      `)
      .single();

    if (error || !data) {
      console.error('Error creating schedule entry:', error?.message);
       if (error?.code === '23505') { // Handle unique constraint (teacher, day, slot)
          return { success: false, error: 'Bu zaman dilimi için zaten bir ders mevcut.' };
      }
      return { success: false, error: error?.message || 'Ders programı girdisi oluşturulamadı.' };
    }

    revalidatePath(`/dashboard/teachers/${teacherId}/schedule`);

    // Map back to camelCase including class name
    const createdEntry = {
      id: data.id,
      teacherId: data.teacher_id,
      dayOfWeek: data.day_of_week,
      timeSlot: data.time_slot,
      className: data.class_name,
      locationName: data.location_name,
      classId: data.class_id,
      classNameDisplay: data.classes ? data.classes.name : null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, entry: createdEntry as TeacherScheduleEntry };
  } catch (err) {
    console.error('createTeacherScheduleEntry error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing schedule entry.
 */
export async function updateTeacherScheduleEntry(
  entryId: string,
  payload: TeacherScheduleFormValues
): Promise<{ success: boolean; entry?: TeacherScheduleEntry; error?: string }> {
  const parse = TeacherScheduleFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Fetch original entry to get day/time for conflict check and teacherId for revalidation
  const { data: existingEntryData, error: fetchOriginalError } = await supabase
      .from('teacher_schedules')
      .select('teacher_id, day_of_week, time_slot, location_name') // Get needed fields
      .eq('id', entryId)
      .single();

  if (fetchOriginalError) {
       console.error('Error fetching original entry details for update:', fetchOriginalError);
       return { success: false, error: 'Güncellenecek ders bilgisi alınamadı.' };
  }

  // *** Start: Location Conflict Check for Update ***
  // Check only if locationName is provided and is different from the original
  if (parse.data.locationName && parse.data.locationName !== existingEntryData.location_name) {
      const { data: conflictingEntry, error: conflictError } = await supabase
        .from('teacher_schedules')
        .select('id')
        .eq('day_of_week', existingEntryData.day_of_week)
        .eq('time_slot', existingEntryData.time_slot)
        .eq('location_name', parse.data.locationName)
        .neq('id', entryId) // Exclude the entry being updated
        .maybeSingle();

      if (conflictError) {
        console.error('Error checking for location conflict during update:', conflictError);
        return { success: false, error: 'Konum uygunluğu kontrol edilirken bir hata oluştu.' };
      }

      if (conflictingEntry) {
        return { success: false, error: 'Bu konum/laboratuvar belirtilen saatte zaten kullanımda.' };
      }
  }
  // *** End: Location Conflict Check for Update ***

  const entryData = {
    class_name: parse.data.className,
    location_name: parse.data.locationName || null,
    class_id: parse.data.classId || null, // Update classId
  };

  try {
    // Revalidation teacherId fetch is now done above
    const teacherIdForRevalidation = existingEntryData.teacher_id;

    const { data, error } = await supabase
      .from('teacher_schedules')
      .update(entryData)
      .eq('id', entryId)
      // Fetch the updated entry with class name
      .select(`
        *,
        classes ( name )
      `)
      .single();

    if (error || !data) {
      console.error('Error updating schedule entry:', error?.message);
       if (error?.code === '23505') { // Handle potential unique constraint issues if fields changed
          return { success: false, error: 'Güncelleme benzersizlik kısıtlamasını ihlal ediyor.' };
      }
      return { success: false, error: error?.message || 'Ders programı girdisi güncellenemedi.' };
    }

    if (teacherIdForRevalidation) {
        revalidatePath(`/dashboard/teachers/${teacherIdForRevalidation}/schedule`);
    }

    // Map back to camelCase
    const updatedEntry = {
       id: data.id,
      teacherId: data.teacher_id,
      dayOfWeek: data.day_of_week,
      timeSlot: data.time_slot,
      className: data.class_name,
      locationName: data.location_name,
      classId: data.class_id,
      classNameDisplay: data.classes ? data.classes.name : null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, entry: updatedEntry as TeacherScheduleEntry };
  } catch (err) {
    console.error('updateTeacherScheduleEntry error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a schedule entry by ID.
 */
export async function deleteTeacherScheduleEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
   try {
    // Optional: Fetch teacherId before deleting if revalidation is needed
    // const { data: entryData } = await supabase.from('teacher_schedules').select('teacher_id').eq('id', entryId).single();

    const { error } = await supabase
      .from('teacher_schedules')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('Error deleting teacher schedule entry:', error);
      return { success: false, error: error.message };
    }

    // if (entryData?.teacher_id) {
    //   revalidatePath(`/dashboard/area-teachers/${entryData.teacher_id}/schedule`);
    // }
    return { success: true };
  } catch (err) {
    console.error('deleteTeacherScheduleEntry error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
} 