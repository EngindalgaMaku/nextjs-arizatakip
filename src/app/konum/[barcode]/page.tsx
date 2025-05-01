import { supabase } from '@/lib/supabase'; // Server-side client
import { notFound } from 'next/navigation';
import React from 'react';
import { ScheduleUpsertEntry } from '@/types/schedules';
import LocationSchedule from '@/components/schedules/LocationSchedule';

// Next.js App Router sayfası için doğru props tipi
type PageProps = {
  params: {
    barcode: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

// Type for location data
interface LocationData {
  name: string;
  properties: Array<{
    key: string;
    value: any;
  }> | null;
}

// Server-side function to fetch location data by barcode value
async function getLocationByBarcode(barcodeValue: string): Promise<LocationData | null> {
  if (!barcodeValue) {
    return null;
  }

  // Select only necessary fields for public view
  const { data, error } = await supabase
    .from('locations')
    .select('name, properties') // Only fetch name and properties
    .eq('barcode_value', barcodeValue)
    .single(); // Expect only one match

  if (error) {
    console.error('Error fetching location by barcode:', error);
    // Don't expose detailed errors publicly, but handle not found
    if (error.code === 'PGRST116') { // PostgREST code for "Resource not found" from .single()
        return null;
    }
    // For other errors, maybe return null or throw a generic error
    return null;
  }
  
  return data as LocationData;
}

// Server-side fetch for schedule entries
async function getScheduleEntriesByLab(labId: string): Promise<ScheduleUpsertEntry[]> {
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('lab_id, day, period, subject, class_name, teacher')
    .eq('lab_id', labId)
    .order('day', { ascending: true })
    .order('period', { ascending: true });
  if (error) {
    console.error('Error fetching schedule entries:', error);
    return [];
  }
  return (data as ScheduleUpsertEntry[]) || [];
}

// Server Component Page
export default async function LocationPublicPage({ params }: any) {
  const { barcode } = params;
  const location = await getLocationByBarcode(barcode);
  const scheduleEntries = await getScheduleEntriesByLab(barcode);

  if (!location) {
    notFound(); // Trigger Next.js 404 page
  }

  const properties = location.properties;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Konum Bilgileri
        </h1>
        <p className="text-lg text-indigo-600 font-semibold mb-4 text-center border-b pb-2">
          {location.name}
        </p>

        {/* If schedule entries exist, show schedule component */}
        {scheduleEntries && scheduleEntries.length > 0 && (
          <LocationSchedule entries={scheduleEntries} />
        )}

        {properties && Array.isArray(properties) && properties.length > 0 ? (
          <div className="max-h-96 overflow-y-auto pr-2 mt-4">
            <div className="space-y-2 text-sm">
              {properties.map((prop, index) => (
                // Use key from prop object if available, otherwise index
                <div key={prop.key || index} className="border-t pt-2">
                  <span className="font-semibold text-gray-600">{prop.key}: </span>
                  <span className="text-gray-800 break-words">
                    {typeof prop.value === 'boolean' ? (prop.value ? 'Evet' : 'Hayır') :
                     typeof prop.value === 'object' && prop.value !== null ? JSON.stringify(prop.value) :
                     String(prop.value ?? '-')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic text-center">Bu konum için ek özellik tanımlanmamış.</p>
        )}
      </div>
    </div>
  );
} 