'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { Class, ClassSchema, ClassFormValues } from '@/types/classes'; // Assuming types are here
import { z } from 'zod';

/**
 * Fetch all classes, including the teacher's name.
 */
export async function fetchClasses(): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      teacher:teachers ( name ) 
    `)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }

  // Map snake_case to camelCase and extract teacher name
  const mappedData = data?.map(cls => ({
    id: cls.id,
    name: cls.name,
    department: cls.department,
    classTeacherId: cls.class_teacher_id,
    classPresidentName: cls.class_president_name,
    teacherName: cls.teacher ? cls.teacher.name : null, // Get teacher name
    displayOrder: cls.display_order,
    createdAt: cls.created_at,
    updatedAt: cls.updated_at,
  })) || [];

  // Validate fetched data (optional but recommended)
  const parseResult = z.array(ClassSchema).safeParse(mappedData);
   if (!parseResult.success) {
      console.error('Fetched classes data validation failed:', parseResult.error);
      // Handle validation error
      return [];
  }

  return parseResult.data;
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
  const { displayOrder, ...restPayload } = payload;
  const parse = ClassSchema.omit({ displayOrder: true }).safeParse(restPayload);

  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  try {
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('classes')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxOrderError) {
      console.error('Error fetching max display_order:', maxOrderError);
      return { success: false, error: 'Sıra numarası alınırken hata oluştu.' };
    }

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const classData = {
      name: parse.data.name,
      department: parse.data.department || null,
      class_teacher_id: parse.data.classTeacherId,
      class_president_name: parse.data.classPresidentName || null,
      display_order: nextOrder,
    };
    
    console.log('[createClass] Mapped data being sent to DB:', classData);

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

/**
 * Moves a class one position up in the display order.
 */
export async function moveClassUp(classId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current class's order and the order of the class above it
    const { data: currentClass, error: fetchError } = await supabase
      .from('classes')
      .select('id, display_order')
      .eq('id', classId)
      .single();

    if (fetchError || !currentClass) {
      console.error('Error fetching class to move up:', fetchError);
      return { success: false, error: 'Sınıf bulunamadı.' };
    }

    const currentOrder = currentClass.display_order;
    if (currentOrder <= 1) {
      return { success: true }; // Already at the top
    }

    // Find the class directly above
    const { data: previousClass, error: fetchPrevError } = await supabase
       .from('classes')
       .select('id, display_order')
       .eq('display_order', currentOrder - 1)
       .single();
       
    if (fetchPrevError || !previousClass) {
       console.error('Error fetching previous class:', fetchPrevError); 
       // This might happen if orders are not sequential, try finding nearest lower
       // For simplicity now, assume sequential or return error
       return { success: false, error: 'Üstteki sınıf bulunamadı veya sıra numaralarında tutarsızlık var.' };
    }

    // Swap the display_order values using a transaction if possible,
    // otherwise perform sequential updates (less safe if one fails)
    // Using sequential updates for now:
    const { error: updateCurrentError } = await supabase
       .from('classes')
       .update({ display_order: previousClass.display_order })
       .eq('id', currentClass.id);

    if (updateCurrentError) {
      console.error('Error updating current class order (up):', updateCurrentError);
      // Attempt to revert? Risky without transaction.
      return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 1).' };
    }
    
    const { error: updatePreviousError } = await supabase
      .from('classes')
      .update({ display_order: currentOrder })
      .eq('id', previousClass.id);
      
    if (updatePreviousError) {
       console.error('Error updating previous class order (up):', updatePreviousError);
       // CRITICAL: Need to revert the first update here!
       // Rollback manually (attempt to set currentClass back to currentOrder)
       await supabase.from('classes').update({ display_order: currentOrder }).eq('id', currentClass.id); 
       return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 2), geri alma denendi.' };
    }

    revalidatePath('/dashboard/classes');
    return { success: true };

  } catch (err) {
    console.error('moveClassUp error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Moves a class one position down in the display order.
 */
export async function moveClassDown(classId: string): Promise<{ success: boolean; error?: string }> {
   try {
    // Get the current class's order
    const { data: currentClass, error: fetchError } = await supabase
      .from('classes')
      .select('id, display_order')
      .eq('id', classId)
      .single();

    if (fetchError || !currentClass) {
      console.error('Error fetching class to move down:', fetchError);
      return { success: false, error: 'Sınıf bulunamadı.' };
    }
    
    const currentOrder = currentClass.display_order;

    // Find the class directly below
    const { data: nextClass, error: fetchNextError } = await supabase
       .from('classes')
       .select('id, display_order')
       .eq('display_order', currentOrder + 1)
       .single();
       
     // If no class below, it's already at the bottom
     if (fetchNextError?.code === 'PGRST116') { // 'PGRST116' is Supabase code for single() not finding a row
         return { success: true }; // Already at the bottom
     } else if (fetchNextError || !nextClass) {
        console.error('Error fetching next class:', fetchNextError);
        return { success: false, error: 'Alttaki sınıf bulunamadı veya sıra numaralarında tutarsızlık var.' };
     }

    // Swap the display_order values (Sequential Updates)
    const { error: updateCurrentError } = await supabase
       .from('classes')
       .update({ display_order: nextClass.display_order })
       .eq('id', currentClass.id);

    if (updateCurrentError) {
      console.error('Error updating current class order (down):', updateCurrentError);
      return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 1).' };
    }
    
    const { error: updateNextError } = await supabase
      .from('classes')
      .update({ display_order: currentOrder })
      .eq('id', nextClass.id);
      
    if (updateNextError) {
       console.error('Error updating next class order (down):', updateNextError);
       // CRITICAL: Rollback the first update!
       await supabase.from('classes').update({ display_order: currentOrder }).eq('id', currentClass.id);
       return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 2), geri alma denendi.' };
    }

    revalidatePath('/dashboard/classes');
    return { success: true };

  } catch (err) {
    console.error('moveClassDown error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}