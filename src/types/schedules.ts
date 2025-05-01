import { z } from 'zod';

// Upsert payload for a schedule entry (no id, created_at, updated_at)
export const ScheduleUpsertEntrySchema = z.object({
  lab_id: z.string().uuid('Geçerli bir laboratuvar ID girilmelidir.'),
  day: z.number().int().min(1).max(5, 'Gün 1-5 arasında olmalıdır.'), // 1: Pazartesi, ..., 5: Cuma
  period: z.number().int().min(1).max(9, 'Ders periyodu 1-9 arasında olmalıdır.'),
  subject: z.string().min(1, 'Ders adı boş olamaz.'),
  class_name: z.string().min(1, 'Sınıf adı boş olamaz.'),
  teacher: z.string().min(1, 'Öğretmen adı boş olamaz.'),
});
export type ScheduleUpsertEntry = z.infer<typeof ScheduleUpsertEntrySchema>;

// Full schedule entry as stored in the database
export const ScheduleEntrySchema = ScheduleUpsertEntrySchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  teacher: z.string(),
});
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>; 