'use server';

import { supabase } from '@/lib/supabase';
import { DalDers, DalDersFormSchema, DalDersFormValues, SinifSeviyesi } from '@/types/dalDersleri';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all lessons for a specific branch (dal).
 */
export async function fetchDalDersleri(dalId: string): Promise<DalDers[]> {
  if (!dalId) return [];

  const { data, error } = await supabase
    .from('dal_dersleri')
    .select('*')
    .eq('dal_id', dalId)
    // Order by grade level, then lesson name for consistency
    .order('sinif_seviyesi', { ascending: true })
    .order('ders_adi', { ascending: true });

  if (error) {
    console.error(`Error fetching dersler for dal ${dalId}:`, error);
    throw error; 
  }
  
  // Map snake_case to camelCase and ensure type safety
  const mappedData = data?.map(ders => ({
      id: ders.id,
      dalId: ders.dal_id,
      sinifSeviyesi: ders.sinif_seviyesi as SinifSeviyesi, // Cast to specific literal type
      dersAdi: ders.ders_adi,
      haftalikSaat: ders.haftalik_saat,
      createdAt: ders.created_at,
      updatedAt: ders.updated_at,
  })) || [];

  return mappedData as DalDers[];
}

/**
 * Create a new lesson entry for a branch.
 */
export async function createDalDers(
  dalId: string,
  payload: DalDersFormValues
): Promise<{ success: boolean; ders?: DalDers; error?: string }> {
  const parse = DalDersFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const dersData = {
    dal_id: dalId,
    sinif_seviyesi: parse.data.sinifSeviyesi,
    ders_adi: parse.data.dersAdi,
    haftalik_saat: parse.data.haftalikSaat,
  };

  try {
    const { data, error } = await supabase
      .from('dal_dersleri')
      .insert(dersData)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating dal dersi:', error?.message);
      if (error?.code === '23505') { // Handle unique constraint violation
          return { success: false, error: 'Bu sınıfta bu ders zaten mevcut.' };
      }
      return { success: false, error: error?.message || 'Ders oluşturulamadı.' };
    }
    revalidatePath(`/dashboard/dallar/${dalId}/dersler`);
    // Map back to camelCase
    const createdDers = { 
        id: data.id,
        dalId: data.dal_id,
        sinifSeviyesi: data.sinif_seviyesi as SinifSeviyesi,
        dersAdi: data.ders_adi,
        haftalikSaat: data.haftalik_saat,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
    return { success: true, ders: createdDers as DalDers };
  } catch (err) {
    console.error('createDalDers error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing branch lesson.
 */
export async function updateDalDers(
  dersId: string, 
  payload: DalDersFormValues
): Promise<{ success: boolean; ders?: DalDers; error?: string }> {
  const parse = DalDersFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const dersData = {
    sinif_seviyesi: parse.data.sinifSeviyesi,
    ders_adi: parse.data.dersAdi,
    haftalik_saat: parse.data.haftalikSaat,
  };

  try {
    // We need the dal_id for revalidation, fetch it first (or pass it)
    const { data: existingData, error: fetchError } = await supabase
      .from('dal_dersleri')
      .select('dal_id')
      .eq('id', dersId)
      .single();

    if (fetchError || !existingData) {
       console.error('Error fetching dal_id for revalidation:', fetchError);
       // Continue update, but log warning about revalidation
    }

    const { data, error } = await supabase
      .from('dal_dersleri')
      .update(dersData)
      .eq('id', dersId)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating dal dersi:', error?.message);
      if (error?.code === '23505') { // Handle unique constraint violation
          return { success: false, error: 'Bu sınıfta bu ders zaten mevcut.' };
      }
      return { success: false, error: error?.message || 'Ders güncellenemedi.' };
    }
    
    if (existingData?.dal_id) {
        revalidatePath(`/dashboard/dallar/${existingData.dal_id}/dersler`);
    }
    
    // Map back to camelCase
     const updatedDers = { 
        id: data.id,
        dalId: data.dal_id,
        sinifSeviyesi: data.sinif_seviyesi as SinifSeviyesi,
        dersAdi: data.ders_adi,
        haftalikSaat: data.haftalik_saat,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
    return { success: true, ders: updatedDers as DalDers };
  } catch (err) {
    console.error('updateDalDers error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a branch lesson by ID.
 */
export async function deleteDalDers(dersId: string): Promise<{ success: boolean; error?: string }> {
   try {
     // We need the dal_id for revalidation, fetch it first
    const { data: existingData, error: fetchError } = await supabase
      .from('dal_dersleri')
      .select('dal_id')
      .eq('id', dersId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore if not found already
       console.error('Error fetching dal_id for revalidation before delete:', fetchError);
    }

    const { error } = await supabase
      .from('dal_dersleri')
      .delete()
      .eq('id', dersId);

    if (error) {
      console.error('Error deleting dal dersi:', error);
      return { success: false, error: error.message };
    }
    
    if (existingData?.dal_id) {
        revalidatePath(`/dashboard/dallar/${existingData.dal_id}/dersler`);
    }
    
    return { success: true };
  } catch (err) {
    console.error('deleteDalDers error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch all distinct lesson names from dal_dersleri.
 */
export async function fetchDistinctDersAdlari(): Promise<string[]> {
  const { data, error } = await supabase
    .from('dal_dersleri')
    .select('ders_adi'); // Select only the lesson name column

  if (error) {
    console.error('Error fetching distinct ders adlari:', error);
    return []; // Return empty array on error
  }

  // Get unique, non-null/empty names
  const distinctNames = [
    ...new Set(
      data
        ?.map(item => item.ders_adi)
        .filter((name): name is string => !!name) // Filter out null/undefined and type guard
    )
  ];

  return distinctNames.sort(); // Sort alphabetically
} 