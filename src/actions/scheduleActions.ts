import { supabase } from '@/lib/supabase';
import { ScheduleEntry, ScheduleUpsertEntry } from '@/types/schedules';

/**
 * Fetch all schedule entries for a given lab, ordered by day and period.
 */
export async function fetchScheduleEntries(labId: string): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('lab_id', labId)
    .order('day', { ascending: true })
    .order('period', { ascending: true });

  if (error) {
    console.error('Error fetching schedule entries:', error);
    throw error;
  }
  return (data as ScheduleEntry[]) || [];
}

/**
 * Save (upsert) schedule entries for a lab by deleting old and inserting new.
 * The upsertEntries array must include lab_id, day, period, subject, class_name.
 */
export async function saveScheduleEntries(entries: ScheduleUpsertEntry[]): Promise<{ success: boolean; error?: string }> {
  if (entries.length === 0) {
    return { success: true };
  }
  const labId = entries[0].lab_id;
  try {
    // Delete existing entries for this lab
    await supabase
      .from('schedule_entries')
      .delete()
      .eq('lab_id', labId);

    // Insert new schedule entries
    const { error: insertError } = await supabase
      .from('schedule_entries')
      .insert(entries);

    if (insertError) {
      console.error('Error saving schedule entries:', insertError);
      return { success: false, error: insertError.message };
    }

    // No revalidation needed in client; UI will update via React state
    return { success: true };
  } catch (err) {
    console.error('saveScheduleEntries error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
} 