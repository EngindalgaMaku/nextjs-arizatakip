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
 * Fetch all schedule entries for a specific teacher.
 */
export async function fetchTeacherSchedule(teacherId: string): Promise<TeacherScheduleEntry[]> {
  if (!teacherId) {
    console.warn('fetchTeacherSchedule called without teacherId');
    return [];
  }
  const { data, error } = await supabase
    .from('teacher_schedules')
    .select('*')
    .eq('teacher_id', teacherId);

  if (error) {
    console.error(`Error fetching schedule for teacher ${teacherId}:`, error);
    throw error; // Or return empty array depending on desired error handling
  }

  console.log(`[fetchTeacherSchedule] Raw data from Supabase for teacher ${teacherId}:`, data);

  // Map snake_case to camelCase
  const mappedData = data?.map(entry => ({
      id: entry.id,
      teacherId: entry.teacher_id,
      dayOfWeek: entry.day_of_week,
      timeSlot: entry.time_slot,
      className: entry.class_name,
      locationName: entry.location_name,
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
 * Create a new schedule entry for a teacher.
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

  const entryData = {
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    time_slot: timeSlot,
    class_name: parse.data.className || null,
    location_name: parse.data.locationName || null,
  };

  try {
    const { data, error } = await supabase
      .from('teacher_schedules')
      .insert(entryData)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating teacher schedule entry:', error?.message);
      // Handle unique constraint violation specifically? (error.code === '23505')
      if (error?.code === '23505') {
          return { success: false, error: 'Bu zaman dilimi için zaten bir ders programı mevcut.' };
      }
      return { success: false, error: error?.message || 'Entry could not be created' };
    }
    // Map response back to camelCase
    const createdEntry = {
        id: data.id,
        teacherId: data.teacher_id,
        dayOfWeek: data.day_of_week,
        timeSlot: data.time_slot,
        className: data.class_name,
        locationName: data.location_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
     revalidatePath(`/dashboard/area-teachers/${teacherId}/schedule`);
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

  const entryData = {
    class_name: parse.data.className || null,
    location_name: parse.data.locationName || null,
    // day/time/teacher not updated here, only content
  };

  try {
    const { data, error } = await supabase
      .from('teacher_schedules')
      .update(entryData)
      .eq('id', entryId)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating teacher schedule entry:', error?.message);
      return { success: false, error: error?.message || 'Entry could not be updated' };
    }
     const updatedEntry = {
        id: data.id,
        teacherId: data.teacher_id,
        dayOfWeek: data.day_of_week,
        timeSlot: data.time_slot,
        className: data.class_name,
        locationName: data.location_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
    // TODO: Figure out how to get teacherId here for revalidation if needed
    // revalidatePath(`/dashboard/area-teachers/${teacherId}/schedule`);
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