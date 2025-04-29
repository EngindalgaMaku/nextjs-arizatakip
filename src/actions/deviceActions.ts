'use server';

import { supabase } from '@/lib/supabase';
import { Device, DeviceFormData, DeviceSchema } from '@/types/devices';
import { Location } from '@/types/locations'; // Import Location type for relationship typing
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // Keep Zod import for validation logic

// Define a type for the fetched data including location name
// Note: Supabase returns related data nested. Adjust if your client setup differs.
export interface DeviceWithLocationName extends Device {
  locations: { name: string } | null; // Supabase nests related data like this by default
}

/**
 * Fetches all devices from the database, including their location name.
 * Returns data conforming to the Device[] type for consistency.
 */
export async function fetchDevices(): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      id,
      name,
      type,
      serial_number,
      location_id,
      barcode_value,
      properties,
      purchase_date,
      warranty_expiry_date,
      status,
      notes,
      created_at,
      updated_at,
      locations ( id, name )
    `);

  if (error) {
    console.error('Original Supabase Error fetching devices:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // Map the data to the Device[] structure
  const mappedData = data.map(device => {
    // Ensure device.locations is treated as an object before accessing properties
    const locationData = device.locations && typeof device.locations === 'object' && !Array.isArray(device.locations)
      ? { id: (device.locations as any).id, name: (device.locations as any).name }
      : null;

    return {
      ...device,
      location: locationData,
    };
  });

  // Remove 'locations' property explicitly to match Device type closer
  const finalData = mappedData.map(({ locations, ...rest }) => rest) as Device[];

  return finalData;
}

/**
 * Creates a new device.
 * Calculates and assigns the next sort_order.
 * @param formData - Data from the device form.
 */
export async function createDevice(formData: DeviceFormData): Promise<{ success: boolean; error?: string; device?: Device }> {
  // Validate input data
  const validation = DeviceSchema.safeParse(formData);
  if (!validation.success) {
    console.error('Validation Error:', validation.error.errors);
    const firstError = validation.error.errors[0];
    const errorMessage = firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Geçersiz form verisi.';
    return { success: false, error: errorMessage };
  }

  // Destructure all validated fields from the schema
  const {
    name,
    type,
    location_id,
    serial_number,
    properties,
    purchase_date,
    warranty_expiry_date,
    status,
    notes
  } = validation.data;

  try {
    // Insert the new device data (without barcode_value initially)
    const { data: newDeviceData, error: insertError } = await supabase
      .from('devices')
      .insert({
        name,
        type: type || null,
        location_id: location_id || null,
        serial_number: serial_number || null,
        properties: properties || null,
        purchase_date: purchase_date || null,
        warranty_expiry_date: warranty_expiry_date || null,
        status: status || null,
        notes: notes || null,
        // barcode_value will be updated next
        // sort_order is removed
      })
      .select() // Select the newly created row
      .single();

    if (insertError || !newDeviceData) {
      console.error('Error inserting device:', insertError);
      throw new Error(insertError?.message || 'Cihaz eklenirken bir veritabanı hatası oluştu.');
    }

    // Update the newly created device to set barcode_value = id
    const { data: updatedDevice, error: updateError } = await supabase
      .from('devices')
      .update({ barcode_value: newDeviceData.id })
      .eq('id', newDeviceData.id)
      .select()
      .single();

    if (updateError || !updatedDevice) {
       console.error('Error setting barcode for device:', updateError);
       // Optionally: attempt to delete the previously inserted row for consistency?
       throw new Error(updateError?.message || 'Cihaz barkodu ayarlanırken bir hata oluştu.');
    }

    revalidatePath('/dashboard/devices'); // Revalidate the devices page path
    return { success: true, device: updatedDevice as Device };

  } catch (error) {
    console.error('Create Device Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cihaz oluşturulurken bilinmeyen bir hata oluştu.'
    };
  }
}

/**
 * Updates an existing device.
 * @param id - The ID of the device to update.
 * @param formData - The updated data for the device.
 */
export async function updateDevice(id: string, formData: DeviceFormData): Promise<{ success: boolean; error?: string; device?: Device }> {
    // Validate input data
    const validation = DeviceSchema.safeParse(formData);
    if (!validation.success) {
        console.error('Validation Error:', validation.error.errors);
        const firstError = validation.error.errors[0];
        const errorMessage = firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Geçersiz form verisi.';
        return { success: false, error: errorMessage };
    }

    // Destructure all validated fields
    const {
        name,
        type,
        location_id,
        serial_number,
        properties,
        purchase_date,
        warranty_expiry_date,
        status,
        notes
      } = validation.data;

    try {
        const { data: updatedDeviceData, error: updateError } = await supabase
            .from('devices')
            .update({
                name,
                type: type || null,
                location_id: location_id || null,
                serial_number: serial_number || null,
                properties: properties || null,
                purchase_date: purchase_date || null,
                warranty_expiry_date: warranty_expiry_date || null,
                status: status || null,
                notes: notes || null,
                // barcode_value is set on creation and shouldn't be updated here
                // sort_order is removed
                updated_at: new Date().toISOString(), // Manually update timestamp
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError || !updatedDeviceData) {
            console.error('Error updating device:', updateError);
            throw new Error(updateError?.message || 'Cihaz güncellenirken bir veritabanı hatası oluştu.');
        }

        revalidatePath('/dashboard/devices'); // Revalidate the devices page path
        return { success: true, device: updatedDeviceData as Device };

    } catch (error) {
        console.error('Update Device Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Cihaz güncellenirken bilinmeyen bir hata oluştu.'
        };
    }
}

/**
 * Deletes a device.
 * @param id - The ID of the device to delete.
 */
export async function deleteDevice(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        // No need to fetch sort_order anymore
        // Delete the device
        const { error: deleteError } = await supabase
            .from('devices')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting device:', deleteError);
            throw new Error(deleteError.message || 'Cihaz silinirken bir veritabanı hatası oluştu.');
        }

        // No need to decrement sort_order

        revalidatePath('/dashboard/devices'); // Revalidate the devices page path
        return { success: true };

    } catch (error) {
        console.error('Delete Device Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Cihaz silinirken bilinmeyen bir hata oluştu.'
        };
    }
}

/**
 * Moves a device up or down in the sort order.
 * @param id - The ID of the device to move.
 * @param direction - The direction to move the device ('up' or 'down').
 */
export async function moveDevice(id: string, direction: 'up' | 'down'): Promise<{ success: boolean; error?: string }> {
    try {
        // Fetch the device to move
        const { data: currentDevice, error: fetchCurrentError } = await supabase
            .from('devices')
            .select('id, sort_order')
            .eq('id', id)
            .single();

        if (fetchCurrentError || !currentDevice) {
            console.error('Error fetching device to move:', fetchCurrentError);
            
            // Initialize sort_order for all devices if needed
            if (fetchCurrentError?.code === 'PGRST116') {
                // Device not found or sort_order is null, initialize all devices with sort_order
                await initializeDeviceSortOrder();
                return { success: true };
            }
            
            throw new Error('Taşınacak cihaz bulunamadı veya sıralama bilgisi eksik.');
        }

        // If sort_order is null, initialize it for all devices
        if (currentDevice.sort_order === null) {
            await initializeDeviceSortOrder();
            return { success: true };
        }

        const currentOrder = currentDevice.sort_order;

        // Determine the target order based on direction
        const targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

        // Check if the target position is valid
        if (targetOrder < 1) {
            return { success: false, error: 'Cihaz zaten en üstte.' }; // Already at the top
        }

        // Fetch the neighbor device at the target position
        const { data: neighborDevice, error: fetchNeighborError } = await supabase
            .from('devices')
            .select('id, sort_order')
            .eq('sort_order', targetOrder)
            .single();

        if (fetchNeighborError && fetchNeighborError.code !== 'PGRST116') {
            console.error('Error fetching neighbor device:', fetchNeighborError);
            throw new Error('Komşu cihaz bilgisi alınırken hata oluştu.');
        }

        if (!neighborDevice && direction === 'down') {
             return { success: false, error: 'Cihaz zaten en altta.' }; // Already at the bottom
        }

        if (!neighborDevice) {
             // Should not happen for 'up' if targetOrder > 0, maybe log warning?
             console.warn(`moveDevice: No neighbor found at sort_order ${targetOrder} when moving ${direction}`);
             return { success: false, error: 'Hedef pozisyonda cihaz bulunamadı.' };
        }

        // Swap sort_order values
        const { error: updateError1 } = await supabase
            .from('devices')
            .update({ sort_order: targetOrder })
            .eq('id', currentDevice.id);

        if (updateError1) {
            console.error('Error updating current device sort order:', updateError1);
            throw new Error('Sıralama güncellenirken bir hata oluştu.');
        }

        const { error: updateError2 } = await supabase
            .from('devices')
            .update({ sort_order: currentOrder })
            .eq('id', neighborDevice.id);

        if (updateError2) {
            console.error('Error updating neighbor device sort order:', updateError2);
            // Try to revert the first update if possible
            await supabase
                .from('devices')
                .update({ sort_order: currentOrder })
                .eq('id', currentDevice.id);
            throw new Error('Sıralama güncellenirken bir hata oluştu.');
        }

        revalidatePath('/dashboard/devices');
        return { success: true };

    } catch (error) {
        console.error('Move Device Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Cihaz taşınırken bilinmeyen bir hata oluştu.'
        };
    }
}

/**
 * Initialize sort_order for all devices if needed.
 * This is called when moving a device that doesn't have a sort_order yet.
 */
async function initializeDeviceSortOrder(): Promise<void> {
    try {
        // Get all devices ordered by created_at
        const { data: devices, error: fetchError } = await supabase
            .from('devices')
            .select('id, created_at')
            .order('created_at', { ascending: true });

        if (fetchError || !devices) {
            console.error('Error fetching devices for sort order initialization:', fetchError);
            throw new Error('Cihazlar yüklenirken bir hata oluştu.');
        }

        // Update each device with a new sort_order
        for (let i = 0; i < devices.length; i++) {
            const { error: updateError } = await supabase
                .from('devices')
                .update({ sort_order: i + 1 }) // Start from 1
                .eq('id', devices[i].id);

            if (updateError) {
                console.error(`Error initializing sort_order for device ${devices[i].id}:`, updateError);
                // Continue with other devices
            }
        }

        revalidatePath('/dashboard/devices');
    } catch (error) {
        console.error('Initialize Device Sort Order Error:', error);
        throw error;
    }
} 