'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { Class, ClassSchema, ClassFormValues } from '@/types/classes'; // Assuming types are here

/**
 * Fetch all classes.
 */
export async function fetchClasses(): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*') // Adjust columns as needed, maybe join teacher name
    // Example join: .select('*, teacher:teachers(name)')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
  // Map snake_case from DB to camelCase for frontend Zod type if needed,
  // especially if joining teacher data. For now, assume direct mapping works if columns match Zod fields.
  // TODO: Implement proper mapping if DB columns (e.g., class_teacher_id) don't match Zod fields (classTeacherId)
  return (data as any[]) || []; // Use 'any' for now if structure differs slightly
}

/**
 * Fetch a single class by ID.
 */
export async function fetchClassById(id: string): Promise<Class | null> {
   const { data, error } = await supabase
    .from('classes')
    .select('*') // Adjust columns/joins
    .eq('id', id)
    .single();

    if (error) {
      console.error(`Error fetching class ${id}:`, error);
      if (error.code === 'PGRST116') return null; // Not found is not an error here
      throw error;
    }
    // TODO: Map snake_case to camelCase before returning if needed
    return data as Class | null;
}

/**
 * Create a new class.
 */
export async function createClass(payload: ClassFormValues): Promise<{ success: boolean; class?: Class; error?: string }> {
  const parse = ClassSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Map Zod schema (camelCase) to DB columns (snake_case)
  const classData = {
    name: parse.data.name,
    department: parse.data.department || null,
    class_teacher_id: parse.data.classTeacherId, // Map camelCase to snake_case
    class_president_name: parse.data.classPresidentName || null,
  };
  // --- DEBUG LOG --- 
  console.log('[createClass] Mapped data being sent to DB:', classData);
  console.log('[createClass] Mapped president name:', classData.class_president_name);
  // --- END DEBUG LOG --- 

  try {
    const { data, error } = await supabase
      .from('classes')
      .insert(classData)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating class:', error?.message, error?.details);
      return { success: false, error: error?.message };
    }
    // TODO: Remap snake_case back to camelCase if needed before returning
    return { success: true, class: data as Class };
  } catch (err) {
    console.error('createClass error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing class.
 */
export async function updateClass(id: string, payload: ClassFormValues): Promise<{ success: boolean; class?: Class; error?: string }> {
  // Ensure ID is not part of the update payload itself if it came from the form
  const { id: payloadId, ...updatePayload } = payload;
  const parse = ClassSchema.safeParse(updatePayload); // Validate the rest

  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Map Zod schema (camelCase) to DB columns (snake_case)
  const classData = {
    name: parse.data.name,
    department: parse.data.department || null,
    class_teacher_id: parse.data.classTeacherId, // Map camelCase to snake_case
    class_president_name: parse.data.classPresidentName || null,
  };
  // --- DEBUG LOG --- 
  console.log(`[updateClass] Mapped data being sent to DB for ID: ${id}`, classData);
  console.log('[updateClass] Mapped president name:', classData.class_president_name);
  // --- END DEBUG LOG --- 

  try {
    const { data, error } = await supabase
      .from('classes')
      .update(classData)
      .eq('id', id) // Use the ID passed as argument
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating class:', error?.message, error?.details);
      return { success: false, error: error?.message };
    }
     // TODO: Remap snake_case back to camelCase if needed before returning
    return { success: true, class: data as Class };
  } catch (err) {
    console.error('updateClass error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a class by ID.
 */
export async function deleteClass(id: string): Promise<{ success: boolean; error?: string }> {
   try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting class:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('deleteClass error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// You might also need an action to fetch teachers for the form dropdown
// Assuming it exists in teacherActions.ts or similar:
// import { fetchTeachers } from './teacherActions';

// --- REMOVE OLD ClassGroup CODE --- 
/*
// Represents a class group entity
export interface ClassGroup {
  id: string;
  name: string;
}

export async function fetchClassGroups(): Promise<ClassGroup[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
  return data as ClassGroup[];
}

export async function createClassGroup(name: string): Promise<ClassGroup> {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name })
    .select('id, name')
    .single();
  if (error || !data) {
    console.error('Error creating class:', error);
    throw error ?? new Error('Unknown error creating class');
  }
  // Revalidate the classes list page
  revalidatePath('/dashboard/classes');
  return data as ClassGroup;
}
*/
// --- END REMOVE --- 