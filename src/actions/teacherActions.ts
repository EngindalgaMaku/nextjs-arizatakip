'use server';

import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Teacher, TeacherFormValues, TeacherFormSchema, TeacherRole } from '@/types/teachers';
import { z } from 'zod';
import { BranchFormSchema, BranchFormValues } from '@/types/branches';
import { revalidatePath } from 'next/cache';
import { TeacherSchema } from '@/types/teachers';

/**
 * Fetch all teachers, optionally filtered by semester.
 */
export async function fetchTeachers(semesterId?: string): Promise<Partial<Teacher>[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from('teachers')
    .select('id, name, birth_date, role, phone, branch_id, created_at, updated_at, is_active, semester_id'); // Include semester_id

  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }

  const mappedData = (data || []).map(teacher => {
    const mappedRole = typeof teacher.role === 'string' ? teacher.role.toUpperCase() as TeacherRole : null;
    return {
      id: teacher.id,
      semester_id: teacher.semester_id, // Map semester_id
      name: teacher.name,
      birthDate: teacher.birth_date,
      role: mappedRole,
      phone: teacher.phone,
      branchId: teacher.branch_id,
      createdAt: teacher.created_at,
      updatedAt: teacher.updated_at,
      is_active: teacher.is_active
    };
  });

  // Validate mapped data (ensure partial() allows missing semester_id if schema expects it)
  const validatedData = mappedData.map(teacher => {
    const parseResult = TeacherSchema.partial().safeParse(teacher);
    if (!parseResult.success) {
      console.warn(`Fetched teacher data validation failed for ID ${teacher.id}:`, parseResult.error);
      return null;
    }
    return parseResult.data;
  }).filter(Boolean) as Partial<Teacher>[];

  return validatedData;
}

/**
 * Create a new teacher, associated with the provided semester.
 */
export async function createTeacher(payload: TeacherFormValues, semesterId: string): Promise<{ success: boolean; teacher?: Teacher; error?: string | z.ZodIssue[] }> {
  if (!z.string().uuid().safeParse(semesterId).success) {
    return { success: false, error: 'Geçersiz sömestr ID.' };
  }

  const parse = TeacherFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  // Map camelCase form values to snake_case DB columns
  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role ? parse.data.role.toLowerCase() : null,
    phone: parse.data.phone || null,
    branch_id: parse.data.branchId || null,
    is_active: true, // Directly set to true on creation
    semester_id: semesterId, // Add semester ID
  };

  const supabase = createSupabaseServerClient();
  try {
    const { data: newTeacherData, error } = await supabase
      .from('teachers')
      .insert(teacherData)
      .select()
      .single();

    if (error || !newTeacherData) {
      console.error('Error creating teacher:', error?.message);
      // Handle specific DB errors
      if (error?.code === '23503') return { success: false, error: 'Seçilen branş veya sömestr geçerli değil.' };
      return { success: false, error: error?.message || 'Öğretmen oluşturulamadı.' };
    }

    // Map DB result back to Teacher schema type
    const mappedResult: Teacher = {
        id: newTeacherData.id,
        semester_id: newTeacherData.semester_id,
        name: newTeacherData.name,
        birthDate: newTeacherData.birth_date,
        role: typeof newTeacherData.role === 'string' ? newTeacherData.role.toUpperCase() as TeacherRole : null,
        phone: newTeacherData.phone,
        branchId: newTeacherData.branch_id,
        createdAt: newTeacherData.created_at,
        updatedAt: newTeacherData.updated_at,
        is_active: newTeacherData.is_active,
    };

    // Final validation of the created object
    const finalParse = TeacherSchema.safeParse(mappedResult);
    if (!finalParse.success) {
      console.error('Created teacher data validation failed:', finalParse.error);
      return { success: false, error: 'Öğretmen oluşturuldu ancak veri doğrulanamadı.' };
    }

    revalidatePath('/dashboard/area-teachers');
    return { success: true, teacher: finalParse.data };

  } catch (err) {
    console.error('Create teacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing teacher. Semester is usually not updated here.
 */
export async function updateTeacher(id: string, payload: TeacherFormValues): Promise<{ success: boolean; teacher?: Teacher; error?: string | z.ZodIssue[] }> {
   const parse = TeacherFormSchema.safeParse(payload);
   if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  // Map form values to DB columns (excluding semester_id)
  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role ? parse.data.role.toLowerCase() : null,
    phone: parse.data.phone || null,
    branch_id: parse.data.branchId || null,
    // Do not update is_active here, use updateTeacherActiveStatus
  };

  const supabase = createSupabaseServerClient();
   try {
    const { data: updatedTeacherData, error } = await supabase
      .from('teachers')
      .update(teacherData)
      .eq('id', id)
      .select()
      .single();

     if (error || !updatedTeacherData) {
        console.error(`Error updating teacher ${id}:`, error?.message);
        if (error?.code === '23503') return { success: false, error: 'Seçilen branş geçersiz.' };
        return { success: false, error: error?.message || 'Öğretmen güncellenemedi.' };
     }

      // Map DB result back to Teacher type
     const mappedResult: Teacher = {
        id: updatedTeacherData.id,
        semester_id: updatedTeacherData.semester_id, // Include semester_id from DB
        name: updatedTeacherData.name,
        birthDate: updatedTeacherData.birth_date,
        role: typeof updatedTeacherData.role === 'string' ? updatedTeacherData.role.toUpperCase() as TeacherRole : null,
        phone: updatedTeacherData.phone,
        branchId: updatedTeacherData.branch_id,
        createdAt: updatedTeacherData.created_at,
        updatedAt: updatedTeacherData.updated_at,
        is_active: updatedTeacherData.is_active,
    };

     // Validate final object
     const finalParse = TeacherSchema.safeParse(mappedResult);
     if (!finalParse.success) {
        console.error('Updated teacher data validation failed:', finalParse.error);
        return { success: false, error: 'Öğretmen güncellendi ancak veri doğrulanamadı.' };
     }

     revalidatePath('/dashboard/area-teachers');
     return { success: true, teacher: finalParse.data };

   } catch (err) {
    console.error('Update teacher error:', err);
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
    // Select ALL fields defined in TeacherSchema (using snake_case)
    .select(`id, name, birth_date, role, phone, branch_id, created_at, updated_at, is_active`)
    .eq('id', id)
    .single();

    if (error) {
      console.error(`[fetchTeacherById] Error fetching teacher ${id}:`, error);
      // If Supabase returns error indicating 0 rows found, return null
      if (error.code === 'PGRST116') { 
          console.log(`[fetchTeacherById] Teacher ${id} not found (PGRST116).`);
          return null; 
      }
      // For other errors, you might throw or return null depending on desired handling
      // Throwing might be better to indicate a real DB issue
      throw error;
    }
    
    // If data is null/undefined even without an error (shouldn't happen with .single() unless RLS hides it)
    if (!data) { 
        console.warn(`[fetchTeacherById] No data returned for teacher ${id} despite no error.`);
        return null;
    }
    
    // Map ALL fields from snake_case to camelCase
    const mappedRole = typeof data.role === 'string' ? data.role.toUpperCase() as TeacherRole : null;
    const teacherData = {
        id: data.id,
        name: data.name,
        birthDate: data.birth_date,
        role: mappedRole, // Use mapped role
        phone: data.phone,
        branchId: data.branch_id, 
        createdAt: data.created_at, // Add createdAt
        updatedAt: data.updated_at, // Add updatedAt
        is_active: data.is_active   // Add is_active
    };
    
    // Validate the complete mapped object against the full TeacherSchema
    console.log(`[fetchTeacherById] Validating mapped data for teacher ${id}:`, teacherData);
    const parseResult = TeacherSchema.safeParse(teacherData);
    
    if (!parseResult.success) {
        // Log detailed validation errors
        console.error(`[fetchTeacherById] Validation failed for fetched teacher ${id}:`, JSON.stringify(parseResult.error.flatten(), null, 2));
        // Return null if validation fails, as the data doesn't match the expected type
        return null;
    }
    
    console.log(`[fetchTeacherById] Successfully fetched and validated teacher ${id}.`);
    // Return the validated data which conforms to the Teacher type
    return parseResult.data; 
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

// --- NEW ACTION TO UPDATE ACTIVE STATUS ---
export async function updateTeacherActiveStatus(teacherId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  if (!teacherId) {
    return { success: false, error: 'Öğretmen IDsi belirtilmedi.' };
  }

  console.log(`[TeacherAction] Updating active status for ${teacherId} to ${isActive}`);

  try {
    const { error } = await supabase
      .from('teachers')
      .update({ is_active: isActive, updated_at: new Date().toISOString() }) // Update is_active and timestamp
      .eq('id', teacherId);

    if (error) {
      console.error(`[TeacherAction] Error updating active status for ${teacherId}:`, error);
      return { success: false, error: error.message };
    }

    // Revalidate the teachers list page
    revalidatePath('/dashboard/area-teachers'); 
    console.log(`[TeacherAction] Active status updated successfully for ${teacherId}`);
    return { success: true };

  } catch (err: any) {
    console.error(`[TeacherAction] Uncaught error updating status for ${teacherId}:`, err);
    return { success: false, error: err?.message || 'Durum güncellenirken bilinmeyen bir hata oluştu.' };
  }
}
// --- END NEW ACTION --- 