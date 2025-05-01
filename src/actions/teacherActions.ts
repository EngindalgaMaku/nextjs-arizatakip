import supabase from '@/lib/supabase-browser';
import { Teacher, TeacherSchema, TeacherFormValues, TeacherFormSchema } from '@/types/teachers';

/**
 * Fetch all teachers.
 */
export async function fetchTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, birth_date, role, phone')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }
  // Map snake_case to camelCase
  const mappedData = data?.map(teacher => ({
      ...teacher,
      birthDate: teacher.birth_date,
      // phone should map directly if column name is 'phone'
  })) || [];
  return mappedData as Teacher[];
}

/**
 * Create a new teacher.
 */
export async function createTeacher(payload: TeacherFormValues): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
  const parse = TeacherFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role || null,
    phone: parse.data.phone || null,
  };

  try {
    const { data, error } = await supabase
      .from('teachers')
      .insert(teacherData)
      .select('id, name, birth_date, role, phone')
      .single();

    if (error || !data) {
      console.error('Error creating teacher:', error?.message);
      return { success: false, error: error?.message };
    }
     const createdTeacher = { ...data, birthDate: data.birth_date }; // Map back
    return { success: true, teacher: createdTeacher as Teacher };
  } catch (err) {
    console.error('createTeacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing teacher.
 */
export async function updateTeacher(id: string, payload: TeacherFormValues): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
  const parse = TeacherFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role || null,
    phone: parse.data.phone || null,
  };

  try {
    const { data, error } = await supabase
      .from('teachers')
      .update(teacherData)
      .eq('id', id)
      .select('id, name, birth_date, role, phone')
      .single();

    if (error || !data) {
      console.error('Error updating teacher:', error?.message);
      return { success: false, error: error?.message };
    }
    const updatedTeacher = { ...data, birthDate: data.birth_date }; // Map back
    return { success: true, teacher: updatedTeacher as Teacher };
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
    .select('id, name, birth_date, role, phone') // Ensure all needed fields are selected
    .eq('id', id)
    .single();

    if (error) {
      console.error(`Error fetching teacher ${id}:`, error);
      if (error.code === 'PGRST116') return null; // Not found is not an error here
      throw error;
    }
    // Map snake_case to camelCase
    if (!data) return null;
    const teacher: Teacher = {
        id: data.id,
        name: data.name,
        birthDate: data.birth_date,
        role: data.role,
        phone: data.phone,
    };
    return teacher;
}

// Add other teacher actions (create, update, delete) here if needed later 