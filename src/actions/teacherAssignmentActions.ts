'use server';

import { supabase } from '@/lib/supabase';
import {
    TeacherCourseAssignment,
    TeacherCourseAssignmentSchema,
    TeacherCourseAssignmentFormValues,
    TeacherCourseAssignmentFormSchema
} from '@/types/teacherCourseAssignments'; // Assuming types are defined here
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all course assignments for a specific teacher.
 */
export async function fetchTeacherAssignments(teacherId: string): Promise<TeacherCourseAssignment[]> {
  if (!teacherId) return [];

  console.log(`[Action] Fetching assignments for teacherId: ${teacherId}`);
  const { data, error } = await supabase
    .from('teacher_course_assignments') 
    .select(`
      id,
      teacher_id,
      dal_ders_id,
      assignment, 
      created_at,
      updated_at,
      dal_ders:dal_dersleri ( id, ders_adi, sinif_seviyesi ),
      teachers ( id, name )
    `)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  // Log the raw data received from Supabase
  console.log('[Action] Raw data received from Supabase:', data);

  if (error) {
    console.error(`Error fetching assignments for teacher ${teacherId}:`, error);
    throw error;
  }
  
  // Log before mapping
  console.log('[Action] Mapping fetched data...');
  const mappedData = data?.map(item => ({
    id: item.id,
    teacher_id: item.teacher_id,
    dal_ders_id: item.dal_ders_id,
    assignment: item.assignment,
    created_at: item.created_at,
    updated_at: item.updated_at,
    teacher: Array.isArray(item.teachers) && item.teachers.length > 0 ? {
      id: item.teachers[0]?.id,
      name: item.teachers[0]?.name
    } : undefined,
    dal_ders: Array.isArray(item.dal_ders) && item.dal_ders.length > 0 ? {
        id: item.dal_ders[0]?.id,
        dersAdi: item.dal_ders[0]?.ders_adi,
        sinifSeviyesi: item.dal_ders[0]?.sinif_seviyesi
    } : undefined,
  })) || [];
  
  // Log after mapping
  console.log('[Action] Mapped data:', mappedData);

  // Use a schema that includes the optional dalDers structure if needed for validation
  // For now, let's trust the mapping and cast
  // const parseResult = z.array(TeacherCourseAssignmentSchema).safeParse(mappedData);
  // if (!parseResult.success) { ... }

  return mappedData as TeacherCourseAssignment[]; // Be careful with casting
}

/**
 * Create a new teacher course assignment.
 */
export async function createTeacherAssignment(teacherId: string, dalDersId: string, payload: TeacherCourseAssignmentFormValues): Promise<{ success: boolean; assignment?: TeacherCourseAssignment; error?: string | z.ZodIssue[] }> {
    
    if (!teacherId || !dalDersId) {
      return { success: false, error: 'Öğretmen veya Ders IDsi eksik.' };
    }
    
    const assignmentData = {
        teacher_id: teacherId,
        dal_ders_id: dalDersId,
        assignment: payload.assignment,
    };

    // Log the data just before inserting
    console.log('[Action] Attempting to insert assignmentData:', assignmentData);

    // Remove the redundant Zod validation on the payload object
    /* ... Zod validation comment ... */

    try {
        // Log before the DB call
        console.log('[Action] Calling supabase.insert with:', assignmentData);
        const { data, error } = await supabase
            .from('teacher_course_assignments')
            .insert(assignmentData) 
            .select(`
              id, teacher_id, dal_ders_id, assignment, created_at, updated_at, 
              dal_ders:dal_dersleri ( id, ders_adi, sinif_seviyesi ), 
              teachers ( id, name )
            `)
            .single();

        // Log the result from Supabase
        console.log('[Action] Supabase insert result:', { data, error });

        if (error || !data) {
            console.error('Error creating teacher assignment:', error?.message);
             if (error?.code === '23505') { // Unique constraint violation
                return { success: false, error: 'Bu öğretmen için bu ders ataması zaten mevcut.' };
            }
            return { success: false, error: error?.message || 'Öğretmen ders ataması oluşturulamadı.' };
        }

        revalidatePath(`/dashboard/area-teachers/${teacherId}/assignments`);
        
        const createdAssignment: TeacherCourseAssignment = {
            id: data.id,
            teacher_id: data.teacher_id,
            dal_ders_id: data.dal_ders_id,
            assignment: data.assignment,
            created_at: data.created_at,
            updated_at: data.updated_at,
            teacher: Array.isArray(data.teachers) && data.teachers.length > 0 ? {
              id: data.teachers[0]?.id,
              name: data.teachers[0]?.name
            } : undefined,
            dal_ders: Array.isArray(data.dal_ders) && data.dal_ders.length > 0 ? { 
                id: data.dal_ders[0]?.id,
                dersAdi: data.dal_ders[0]?.ders_adi,
                sinifSeviyesi: data.dal_ders[0]?.sinif_seviyesi
            } : undefined,
        };

        return { success: true, assignment: createdAssignment };
    } catch (err) {
        console.error('[Action] createTeacherAssignment caught error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/**
 * Update an existing teacher course assignment (e.g., change assignment type).
 */
export async function updateTeacherAssignment(assignmentId: string, teacherId: string, payload: TeacherCourseAssignmentFormValues): Promise<{ success: boolean; assignment?: TeacherCourseAssignment; error?: string | z.ZodIssue[] }> {
    
    const parse = TeacherCourseAssignmentFormSchema.safeParse(payload);
    if (!parse.success) {
        return { success: false, error: parse.error.issues };
    }
    
    const updateData = { assignment: payload.assignment };

    try {
        const { data, error } = await supabase
            .from('teacher_course_assignments')
            .update(updateData)
            .eq('id', assignmentId)
            .select(`
              id, teacher_id, dal_ders_id, assignment, created_at, updated_at, 
              dal_ders:dal_dersleri ( id, ders_adi, sinif_seviyesi ), 
              teachers ( id, name )
            `)
            .single();

        if (error || !data) {
            console.error(`Error updating teacher assignment ${assignmentId}:`, error?.message);
            return { success: false, error: error?.message || 'Öğretmen ders ataması güncellenemedi.' };
        }

        revalidatePath(`/dashboard/area-teachers/${teacherId}/assignments`);

         const updatedAssignment: TeacherCourseAssignment = {
            id: data.id,
            teacher_id: data.teacher_id,
            dal_ders_id: data.dal_ders_id,
            assignment: data.assignment,
            created_at: data.created_at,
            updated_at: data.updated_at,
            teacher: Array.isArray(data.teachers) && data.teachers.length > 0 ? {
              id: data.teachers[0]?.id,
              name: data.teachers[0]?.name
            } : undefined,
            dal_ders: Array.isArray(data.dal_ders) && data.dal_ders.length > 0 ? { 
                id: data.dal_ders[0]?.id,
                dersAdi: data.dal_ders[0]?.ders_adi,
                sinifSeviyesi: data.dal_ders[0]?.sinif_seviyesi
            } : undefined,
        };

        return { success: true, assignment: updatedAssignment };
    } catch (err) {
        console.error('updateTeacherAssignment error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/**
 * Delete a teacher course assignment.
 */
export async function deleteTeacherAssignment(assignmentId: string, teacherId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('teacher_course_assignments')
            .delete()
            .eq('id', assignmentId);

        if (error) {
            console.error(`Error deleting teacher assignment ${assignmentId}:`, error);
             // Handle potential foreign key issues if assignments are referenced elsewhere
            return { success: false, error: error.message };
        }

        revalidatePath(`/dashboard/area-teachers/${teacherId}/assignments`);

        return { success: true };
    } catch (err) {
        console.error('deleteTeacherAssignment error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
} 