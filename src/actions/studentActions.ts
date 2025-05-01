// Client-side student actions (no 'use server')

import supabase from '@/lib/supabase-browser';
import { Student, StudentSchema, Guardian } from '@/types/students';

/**
 * Fetch all students for a given class.
 */
export async function fetchStudentsByClass(classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Error fetching students for class ${classId}:`, error);
    throw error;
  }
  return data as Student[] || [];
}

/**
 * Create a new student in the given class.
 */
export async function createStudent(classId: string, payload: Student): Promise<{ success: boolean; student?: Student; error?: string }> {
  const parse = StudentSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Map Zod schema (camelCase) to DB columns (snake_case)
  const studentData = {
    class_id: classId,
    name: parse.data.name,
    school_number: parse.data.schoolNumber,
    email: parse.data.email || null, // Use null if empty string
    birth_date: parse.data.birthDate || null, // Use null if empty string
    phone: parse.data.phone || null, // Use null if empty string
    gender: parse.data.gender, // Optional enum, pass directly
    status: parse.data.status, // Already has default
    guardians: parse.data.guardians ?? [], // Pass validated guardians array, default to empty
  };

  try {
    const { data, error } = await supabase
      .from('students')
      .insert(studentData) // Use the mapped data (includes guardians)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating student:', error?.message, error?.details);
      return { success: false, error: error?.message };
    }

    return { success: true, student: data as Student };
  } catch (err) {
    console.error('createStudent error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing student.
 */
export async function updateStudent(classId: string, id: string, payload: Student): Promise<{ success: boolean; student?: Student; error?: string }> {
  const parse = StudentSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Map Zod schema (camelCase) to DB columns (snake_case)
  const studentData = {
    name: parse.data.name,
    school_number: parse.data.schoolNumber,
    email: parse.data.email || null, // Use null if empty string
    birth_date: parse.data.birthDate || null, // Use null if empty string
    phone: parse.data.phone || null, // Use null if empty string
    gender: parse.data.gender, // Optional enum, pass directly
    status: parse.data.status, // Already has default
    guardians: parse.data.guardians ?? [], // Pass validated guardians array, default to empty
  };

  try {
    const { data, error } = await supabase
      .from('students')
      .update(studentData) // Use the mapped data (includes guardians)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating student:', error?.message, error?.details);
      return { success: false, error: error?.message };
    }

    return { success: true, student: data as Student };
  } catch (err) {
    console.error('updateStudent error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a student by ID.
 */
export async function deleteStudent(classId: string, id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting student:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteStudent error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
} 