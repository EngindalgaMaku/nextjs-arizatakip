'use server';

import { supabase } from '@/lib/supabase';
import { LabType, LabTypeSchema } from '@/types/labTypes'; // Assuming types are in @/types/labTypes
import { LabTypeFormValues, LabTypeFormSchema } from '@/types/labTypes'; // Add LabTypeFormValues and ensure LabTypeFormSchema is imported
import { z } from 'zod';
import { revalidatePath } from 'next/cache'; // May not be strictly needed here, but good practice

/**
 * Fetch all available Lab Types.
 */
export async function fetchLabTypes(): Promise<LabType[]> {
  const { data, error } = await supabase
    .from('lab_types') // Assuming table name is lab_types
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching lab types:', error);
    throw error;
  }
  
  // Optional: Validate data against Zod schema
  const parseResult = z.array(LabTypeSchema).safeParse(data);
  if (!parseResult.success) {
      console.error('Fetched lab types data validation failed:', parseResult.error);
      // Depending on strictness, you might throw an error or return []
      return []; 
  }

  return parseResult.data;
}

/**
 * Fetch the IDs of Lab Types associated with a specific DalDers (lesson).
 */
export async function fetchDalDersLabTypes(dalDersId: string): Promise<string[]> {
  if (!dalDersId) return [];

  const { data, error } = await supabase
    .from('dal_ders_lab_types') // Assuming junction table name
    .select('lab_type_id')
    .eq('dal_ders_id', dalDersId);

  if (error) {
    console.error(`Error fetching lab types for dal_ders ${dalDersId}:`, error);
    throw error;
  }

  return data?.map(item => item.lab_type_id) || [];
}

/**
 * Set/Update the suitable Lab Types for a specific DalDers (lesson).
 * This function deletes existing associations and inserts the new ones.
 */
export async function setDalDersLabTypes(dalDersId: string, labTypeIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!dalDersId) {
    return { success: false, error: 'Dal Ders IDsi belirtilmedi.' };
  }

  try {
    // Start a transaction (optional but recommended for multi-step operations)
    // Note: Supabase JS client doesn't directly support transactions like this yet.
    // We perform operations sequentially.

    // 1. Delete existing associations for this lesson
    const { error: deleteError } = await supabase
      .from('dal_ders_lab_types')
      .delete()
      .eq('dal_ders_id', dalDersId);

    if (deleteError) {
      console.error(`Error deleting existing lab types for dal_ders ${dalDersId}:`, deleteError);
      return { success: false, error: 'Mevcut laboratuvar tipi ilişkileri silinirken hata oluştu.' };
    }

    // 2. Insert new associations if any are provided
    if (labTypeIds && labTypeIds.length > 0) {
      const newAssociations = labTypeIds.map(labTypeId => ({
        dal_ders_id: dalDersId,
        lab_type_id: labTypeId,
      }));

      const { error: insertError } = await supabase
        .from('dal_ders_lab_types')
        .insert(newAssociations);

      if (insertError) {
        console.error(`Error inserting new lab types for dal_ders ${dalDersId}:`, insertError);
         // Potential issue: Deletion succeeded but insertion failed.
         // Consider how to handle this state if necessary.
        return { success: false, error: 'Yeni laboratuvar tipi ilişkileri kaydedilirken hata oluştu.' };
      }
    }
    
    // Consider if revalidation is needed for any related paths
    // e.g., revalidatePath(`/dashboard/dallar/.../dersler/${dalDersId}`); // If there's a specific lesson detail page

    return { success: true };

  } catch (err) {
    console.error('setDalDersLabTypes error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Laboratuvar tipleri ayarlanırken bilinmeyen bir hata oluştu.' };
  }
}

/**
 * Create a new Lab Type.
 */
export async function createLabType(payload: LabTypeFormValues): Promise<{ success: boolean; labType?: LabType; error?: string | z.ZodIssue[] }> {
  const parse = LabTypeSchema.omit({ id: true, created_at: true, updated_at: true }).safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  try {
    const { data, error } = await supabase
      .from('lab_types')
      .insert(parse.data) // Insert validated data (code, name)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating lab type:', error?.message);
      if (error?.code === '23505') { // Unique constraint (e.g., on 'code')
        return { success: false, error: 'Bu kod ile başka bir laboratuvar tipi zaten mevcut.' };
      }
      return { success: false, error: error?.message || 'Laboratuvar tipi oluşturulamadı.' };
    }
    
    revalidatePath('/dashboard/lab-types'); // Revalidate the page where lab types are listed

    return { success: true, labType: data as LabType };
  } catch (err) {
    console.error('createLabType error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing Lab Type.
 */
export async function updateLabType(id: string, payload: LabTypeFormValues): Promise<{ success: boolean; labType?: LabType; error?: string | z.ZodIssue[] }> {
  const parse = LabTypeSchema.omit({ id: true, created_at: true, updated_at: true }).safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  try {
    const { data, error } = await supabase
      .from('lab_types')
      .update(parse.data) // Update with validated data
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error(`Error updating lab type ${id}:`, error?.message);
        if (error?.code === '23505') {
           return { success: false, error: 'Bu kod ile başka bir laboratuvar tipi zaten mevcut.' };
        }
      return { success: false, error: error?.message || 'Laboratuvar tipi güncellenemedi.' };
    }
    
    revalidatePath('/dashboard/lab-types');

    return { success: true, labType: data as LabType };
  } catch (err) {
    console.error('updateLabType error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a Lab Type by ID.
 */
export async function deleteLabType(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Optional: Check for dependencies before deleting (e.g., locations using this type)
    // const { count: locationCount, error: checkError } = await supabase
    //   .from('locations')
    //   .select('*' , { count: 'exact', head: true })
    //   .eq('lab_type_id', id);
    // if (checkError || (locationCount && locationCount > 0)) { ... return error ... }

    const { error } = await supabase
      .from('lab_types')
      .delete()
      .eq('id', id);

    if (error) {
       console.error(`Error deleting lab type ${id}:`, error);
       // Handle foreign key constraint violation (e.g., code 23503)
       if (error.code === '23503') {
            return { success: false, error: 'Bu laboratuvar tipi başka kayıtlarda (konumlar, dersler vb.) kullanıldığı için silinemez.' };
       }
      return { success: false, error: error.message };
    }
    
    revalidatePath('/dashboard/lab-types');
    
    return { success: true };
  } catch (err) {
    console.error('deleteLabType error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
} 