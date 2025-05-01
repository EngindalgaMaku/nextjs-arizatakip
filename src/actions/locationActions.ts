'use server';

import { supabase } from '@/lib/supabase'; // Assuming this is your server-side client
import { Location, LocationFormData, LocationSchema } from '@/types/locations';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Fetches all locations from the database.
 */
export async function fetchLocations(): Promise<Location[]> {
  // Order by the new sort_order column. Default ASC usually puts NULLS LAST.
  const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('sort_order', { ascending: true });

  if (error) {
    console.error('Original Supabase Error fetching locations:', error); // Keep logging
    // Throw the original Supabase error for better debugging
    throw error; 
    // throw new Error('Konumlar getirilirken bir hata oluştu.'); // Temporarily disable generic error
  }

  // Ensure data matches the Location interface, handling potential nulls if needed
  return data as Location[];
}

// Fetch only laboratory locations for selection
export async function fetchLaboratoryLocations(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name')
    .eq('type', 'laboratuvar') // Filter by type
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching laboratory locations:', error);
    // Depending on desired behavior, you might throw or return empty
    return []; 
  }
  return data || [];
}

// --- CRUD Operations --- 

/**
 * Creates a new location.
 * @param formData - Data from the location form.
 */
export async function createLocation(formData: LocationFormData): Promise<{ success: boolean; error?: string; location?: Location }> {
  // Validate input data using the imported schema
  const validation = LocationSchema.safeParse(formData);
  if (!validation.success) {
    console.error('Validation Error:', validation.error.errors);
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  // Include properties in the destructured data
  const { name, type, description, properties } = validation.data;

  try {
    // Get the current maximum sort_order
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('locations')
      .select('sort_order')
      .order('sort_order', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (maxOrderError && maxOrderError.code !== 'PGRST116') { // Ignore error if table is empty
      console.error("Error fetching max sort_order:", maxOrderError);
      throw new Error('Sıralama bilgisi alınırken hata oluştu.');
    }

    const nextOrder = (maxOrderData?.sort_order ?? 0) + 1;

    // Insert the main location data, including the new sort_order
    const { data: newLocationData, error: insertError } = await supabase
      .from('locations')
      .insert({
        name,
        type: type || null,
        department: validation.data.department || null,
        description: description || null,
        properties: properties || [],
        sort_order: nextOrder, // Assign the calculated sort order
        // barcode_value will be updated in a second step
      })
      .select()
      .single();

    if (insertError || !newLocationData) {
      console.error('Error inserting location:', insertError);
      throw new Error(insertError?.message || 'Konum eklenirken bir veritabanı hatası oluştu.');
    }

    // Update the newly created location to set barcode_value = id
    const { data: updatedLocation, error: updateError } = await supabase
      .from('locations')
      .update({ barcode_value: newLocationData.id })
      .eq('id', newLocationData.id)
      .select()
      .single();

    if (updateError || !updatedLocation) {
       console.error('Error setting barcode for location:', updateError);
       // Optionally: attempt to delete the previously inserted row for consistency?
       // Or just report the error.
       throw new Error(updateError?.message || 'Konum barkodu ayarlanırken bir hata oluştu.');
    }

    // Revalidate the path to update the UI
    revalidatePath('/dashboard/locations');

    return { success: true, location: updatedLocation as Location };

  } catch (error) {
    console.error('Create Location Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Konum oluşturulurken bilinmeyen bir hata oluştu.' 
    };
  }
}

/**
 * Updates an existing location.
 * @param id - The ID of the location to update.
 * @param formData - Data from the location form.
 */
export async function updateLocation(id: string, formData: LocationFormData): Promise<{ success: boolean; error?: string; location?: Location }> {
  // Validate ID
  if (!id) {
    // Use a standard English error message to avoid syntax issues
    return { success: false, error: 'Location ID to update not provided.'}; 
  }

  // Validate input data using the imported schema
  const validation = LocationSchema.safeParse(formData);
  if (!validation.success) {
    console.error('Validation Error:', validation.error.errors);
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { name, type, description, properties } = validation.data;

  try {
    const { data: updatedLocation, error } = await supabase
      .from('locations')
      .update({
        name,
        type: type || null,
        department: validation.data.department || null,
        description: description || null,
        properties: properties || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedLocation) {
      console.error('Error updating location:', error);
      throw new Error(error?.message || 'Konum güncellenirken bir veritabanı hatası oluştu.');
    }

    revalidatePath('/dashboard/locations');
    return { success: true, location: updatedLocation as Location };

  } catch (error) {
    console.error('Update Location Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Konum güncellenirken bilinmeyen bir hata oluştu.'
    };
  }
}

/**
 * Moves a location up or down in the manual sort order.
 * @param locationId The ID of the location to move.
 * @param direction 'up' or 'down'.
 */
export async function moveLocation(locationId: string, direction: 'up' | 'down'): Promise<{ success: boolean; error?: string }> {
  if (!locationId || !direction) {
    return { success: false, error: 'Gerekli parametreler eksik.' }; // Missing required parameters
  }

  try {
    // --- Step 1: Get the current location's sort_order ---
    const { data: currentLocation, error: currentError } = await supabase
      .from('locations')
      .select('id, sort_order')
      .eq('id', locationId)
      .single();

    if (currentError || !currentLocation) {
      console.error('Error fetching location to move:', currentError);
      throw new Error('Taşınacak konum bulunamadı veya getirilemedi.');
    }

    if (currentLocation.sort_order === null || currentLocation.sort_order === undefined) {
        return { success: false, error: 'Bu konumun manuel bir sırası yok, taşınamaz.' };
    }

    // --- Step 2: Find the location to swap with ---
    let query;
    if (direction === 'up') {
      // Find the item with the largest sort_order LESS THAN current's sort_order
      query = supabase
        .from('locations')
        .select('id, sort_order')
        .lt('sort_order', currentLocation.sort_order)
        .order('sort_order', { ascending: false })
        .limit(1);
    } else { // direction === 'down'
      // Find the item with the smallest sort_order GREATER THAN current's sort_order
      query = supabase
        .from('locations')
        .select('id, sort_order')
        .gt('sort_order', currentLocation.sort_order)
        .order('sort_order', { ascending: true })
        .limit(1);
    }

    const { data: swapLocations, error: swapError } = await query;

    if (swapError) {
      console.error('Error finding swap partner:', swapError);
      throw new Error('Yer değiştirilecek konum bulunurken hata oluştu.');
    }

    const swapLocation = swapLocations?.[0];

    // --- Step 3: Check if move is possible ---
    if (!swapLocation || swapLocation.sort_order === null || swapLocation.sort_order === undefined) {
      return { success: false, error: `Konum zaten en ${direction === 'up' ? 'üstte' : 'altta'}.` };
    }

    // --- Step 4: Perform the swap (Ideally in a transaction) ---

    // Update 1: Set current location's order to swap location's order
    const { error: update1Error } = await supabase
      .from('locations')
      .update({ sort_order: swapLocation.sort_order })
      .eq('id', currentLocation.id);

    if (update1Error) {
      console.error('Error updating current location order:', update1Error);
      throw new Error('Konum sırası güncellenirken hata oluştu (adım 1).');
    }

    // Update 2: Set swap location's order to current location's original order
    const { error: update2Error } = await supabase
      .from('locations')
      .update({ sort_order: currentLocation.sort_order })
      .eq('id', swapLocation.id);

    if (update2Error) {
      console.error('Error updating swap location order:', update2Error);
      // Attempt to revert the first update for consistency
      console.warn(`Attempting to revert sort_order for ${currentLocation.id}`);
      const { error: revertError } = await supabase
          .from('locations')
          .update({ sort_order: currentLocation.sort_order }) // Revert to original
          .eq('id', currentLocation.id);
      if (revertError) console.error('Failed to revert update1:', revertError);
      throw new Error('Konum sırası güncellenirken hata oluştu (adım 2). Değişiklikler geri alınmaya çalışıldı.');
    }

    // --- Step 5: Revalidate ---
    revalidatePath('/dashboard/locations');
    return { success: true };

  } catch (error) {
    console.error('Move Location Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Konum taşınırken bilinmeyen bir hata oluştu.'
    };
  }
}

/**
 * Deletes a location.
 * @param id - The ID of the location to delete.
 */
export async function deleteLocation(id: string): Promise<{ success: boolean; error?: string }> {
   // Validate ID
  if (!id) {
    // Use a standard English error message to avoid syntax issues
    return { success: false, error: 'Location ID to delete not provided.'}; 
  }

  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting location:', error);
      throw new Error(error.message || 'Konum silinirken bir veritabanı hatası oluştu.');
    }

    revalidatePath('/dashboard/locations');
    return { success: true };

  } catch (error) {
     console.error('Delete Location Error:', error);
     return { 
       success: false, 
       error: error instanceof Error ? error.message : 'Konum silinirken bilinmeyen bir hata oluştu.'
     };
  }
} 