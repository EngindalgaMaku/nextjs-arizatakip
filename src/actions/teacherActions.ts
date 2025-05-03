'use server';

import { supabase } from '@/lib/supabase';
import { Teacher, TeacherFormValues, TeacherFormSchema } from '@/types/teachers';
import { z } from 'zod';
import { BranchFormSchema, BranchFormValues } from '@/types/branches';
import { revalidatePath } from 'next/cache';
import { TeacherSchema } from '@/types/teachers';

/**
 * Fetch all teachers, including their branch ID.
 */
export async function fetchTeachers(): Promise<Partial<Teacher>[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id, 
      name, 
      birth_date, 
      role, 
      phone,
      branch_id
    `)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }
  
  const mappedData = data?.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      birthDate: teacher.birth_date,
      role: teacher.role,
      phone: teacher.phone,
      branchId: teacher.branch_id,
  })) || [];
  
  return mappedData;
}

/**
 * Create a new teacher.
 */
export async function createTeacher(payload: TeacherFormValues): Promise<{ success: boolean; teacher?: Partial<Teacher>; error?: string }> {
  const parse = TeacherFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role || null,
    phone: parse.data.phone || null,
    branch_id: parse.data.branchId || null,
  };

  try {
    const { data: createdData, error: insertError } = await supabase
      .from('teachers')
      .insert(teacherData)
      .select(`id, name, birth_date, role, phone, branch_id`)
      .single();

    if (insertError || !createdData) {
      console.error('Error creating teacher (insert):', insertError?.message);
      return { success: false, error: insertError?.message || 'Insert failed' };
    }

    const createdTeacher: Partial<Teacher> = {
        id: createdData.id,
        name: createdData.name,
        birthDate: createdData.birth_date,
        role: createdData.role,
        phone: createdData.phone,
        branchId: createdData.branch_id,
    };
    return { success: true, teacher: createdTeacher };

  } catch (err) {
    console.error('createTeacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing teacher.
 */
export async function updateTeacher(id: string, payload: TeacherFormValues): Promise<{ success: boolean; teacher?: Partial<Teacher>; error?: string }> {
  const parse = TeacherFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role || null,
    phone: parse.data.phone || null,
    branch_id: parse.data.branchId || null,
  };

  try {
    const { error: updateError } = await supabase
      .from('teachers')
      .update(teacherData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating teacher (update):', updateError.message);
      return { success: false, error: updateError.message };
    }

    const { data: updatedData, error: fetchError } = await supabase
        .from('teachers')
        .select(`id, name, birth_date, role, phone, branch_id`)
        .eq('id', id)
        .single();
        
    if (fetchError || !updatedData) {
      console.error('Error updating teacher (fetch after update):', fetchError?.message);
      return { success: false, error: fetchError?.message || 'Fetch after update failed' };
    }

    const updatedTeacher: Partial<Teacher> = {
        id: updatedData.id,
        name: updatedData.name,
        birthDate: updatedData.birth_date,
        role: updatedData.role,
        phone: updatedData.phone,
        branchId: updatedData.branch_id,
    };
    return { success: true, teacher: updatedTeacher };

  } catch (err) {
    console.error('updateTeacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a teacher by ID.
 */
export async function deleteTeacher(id: string): Promise<{ success: boolean; error?: string }> {
   try {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting teacher:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('deleteTeacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch a single teacher by ID.
 */
export async function fetchTeacherById(id: string): Promise<Teacher | null> {
   if (!id) return null;
   const { data, error } = await supabase
    .from('teachers')
    .select(`id, name, birth_date, role, phone, branch_id`)
    .eq('id', id)
    .single();

    if (error) {
      console.error(`Error fetching teacher ${id}:`, error);
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    if (!data) return null;
    // Map to Teacher type (camelCase)
    const teacherData = {
        id: data.id,
        name: data.name,
        birthDate: data.birth_date,
        role: data.role,
        phone: data.phone,
        branchId: data.branch_id, // Map branch_id
    };
    
    // Validate against the full TeacherSchema
    const parseResult = TeacherSchema.safeParse(teacherData);
    if (!parseResult.success) {
        console.error(`Validation failed for fetched teacher ${id}:`, parseResult.error.flatten());
        return null;
    }
    return parseResult.data; // This is of type Teacher
}

// Add other teacher actions (create, update, delete) here if needed later 

// --- Branch Actions --- 

/**
 * Fetch all branches for dropdowns/filtering.
 */
export interface Branch {
    id: string;
    name: string;
}

export async function fetchBranches(): Promise<Branch[]> {
    const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        // Custom order: Bilişim Teknolojileri first, then alphabetically
        .order('name', { 
            ascending: true, 
            // Treat 'Bilişim Teknolojileri' specially for sorting
            // This specific syntax might need adjustment based on Supabase client capabilities
            // A raw query might be needed if this doesn't work directly
            nullsFirst: false, // Standard behaviour
            // Attempting a simplified CASE logic hint (actual implementation depends on client)
            // Ideally: ORDER BY CASE WHEN name = 'Bilişim Teknolojileri' THEN 0 ELSE 1 END, name ASC
            // Since direct CASE isn't standard in JS client order, we'll sort client-side instead.
        });

    if (error) {
        console.error('Error fetching branches:', error);
        throw error; 
    }

    let branchesData = (data || []).filter(b => b.id && b.name) as Branch[];

    // Client-side sorting to ensure 'Bilişim Teknolojileri' is first
    branchesData.sort((a, b) => {
        if (a.name === 'Bilişim Teknolojileri') return -1; // a comes first
        if (b.name === 'Bilişim Teknolojileri') return 1;  // b comes first
        return a.name.localeCompare(b.name); // Otherwise, sort alphabetically
    });

    return branchesData;
}

/**
 * Create a new branch.
 */
export async function createBranch(payload: BranchFormValues): Promise<{ success: boolean; branch?: Branch; error?: string }> {
  const parse = BranchFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  try {
    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert({ name: parse.data.name })
      .select('id, name') // Select only id and name
      .single();

    if (error || !newBranch) {
      console.error('Error creating branch:', error?.message);
      if (error?.code === '23505') { // unique_violation
          return { success: false, error: `"${parse.data.name}" adında bir branş zaten mevcut.` };
      }
      return { success: false, error: error?.message || 'Branş oluşturulamadı.' };
    }

    // Revalidate the teachers page as it uses the branches list
    revalidatePath('/dashboard/area-teachers'); 

    return { success: true, branch: newBranch }; // Return the simple Branch type

  } catch (err) {
    console.error('createBranch error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
} 