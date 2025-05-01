'use server';

import { supabase } from '@/lib/supabase';
import { Dal, DalFormSchema, DalFormValues } from '@/types/dallar';
import { revalidatePath } from 'next/cache';

const DALLAR_PATH = '/dashboard/dallar'; // Path for revalidation

/**
 * Fetch all branches.
 */
export async function fetchDallar(): Promise<Dal[]> {
  const { data, error } = await supabase
    .from('dallar')
    .select('*')
    // Sort by creation date, oldest first
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching dallar:', error);
    throw error; 
  }
  // No mapping needed if schema matches DB columns
  return data as Dal[] || [];
}

/**
 * Create a new branch.
 */
export async function createDal(payload: DalFormValues): Promise<{ success: boolean; dal?: Dal; error?: string }> {
  const parse = DalFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const dalData = {
    name: parse.data.name,
    description: parse.data.description || null,
  };

  try {
    const { data, error } = await supabase
      .from('dallar')
      .insert(dalData)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating dal:', error?.message);
      if (error?.code === '23505') { // Handle unique constraint violation for name
          return { success: false, error: 'Bu dal adı zaten mevcut.' };
      }
      return { success: false, error: error?.message || 'Dal oluşturulamadı.' };
    }
    revalidatePath(DALLAR_PATH);
    return { success: true, dal: data as Dal };
  } catch (err) {
    console.error('createDal error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing branch.
 */
export async function updateDal(id: string, payload: DalFormValues): Promise<{ success: boolean; dal?: Dal; error?: string }> {
  const parse = DalFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const dalData = {
    name: parse.data.name,
    description: parse.data.description || null,
  };

  try {
    const { data, error } = await supabase
      .from('dallar')
      .update(dalData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating dal:', error?.message);
       if (error?.code === '23505') { // Handle unique constraint violation for name
          return { success: false, error: 'Bu dal adı zaten mevcut.' };
      }
      return { success: false, error: error?.message || 'Dal güncellenemedi.' };
    }
    revalidatePath(DALLAR_PATH);
    return { success: true, dal: data as Dal };
  } catch (err) {
    console.error('updateDal error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a branch by ID.
 */
export async function deleteDal(id: string): Promise<{ success: boolean; error?: string }> {
   try {
    const { error } = await supabase
      .from('dallar')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dal:', error);
      // TODO: Check for foreign key constraint violation if dal is linked elsewhere
      return { success: false, error: error.message };
    }
    revalidatePath(DALLAR_PATH);
    return { success: true };
  } catch (err) {
    console.error('deleteDal error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch a single branch by ID.
 */
export async function fetchDalById(id: string): Promise<Dal | null> {
   if (!id) return null;
   const { data, error } = await supabase
    .from('dallar')
    .select('*')
    .eq('id', id)
    .single();

    if (error) {
      console.error(`Error fetching dal ${id}:`, error);
      if (error.code === 'PGRST116') return null; // Not found is not an error here
      throw error;
    }
    return data as Dal | null;
} 