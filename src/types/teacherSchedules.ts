import { z } from 'zod';

export const DAYS_OF_WEEK = [
  { id: 1, name: 'Pazartesi' },
  { id: 2, name: 'Salı' },
  { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' },
  { id: 5, name: 'Cuma' },
  // Add Saturday/Sunday if needed
  // { id: 6, name: 'Cumartesi' },
  // { id: 0, name: 'Pazar' },
];

export const TIME_SLOTS = [
  { id: 1, time: '08:00 - 08:40' },
  { id: 2, time: '08:50 - 09:30' },
  { id: 3, time: '09:40 - 10:20' },
  { id: 4, time: '10:30 - 11:10' },
  { id: 5, time: '11:20 - 12:00' },
  { id: 6, time: '13:00 - 13:40' },
  { id: 7, time: '13:50 - 14:30' },
  { id: 8, time: '14:40 - 15:20' },
  { id: 9, time: '15:30 - 16:10' },
  { id: 10, time: '16:20 - 17:00' },
  // Add more slots if needed
];

// Schema for a single schedule entry (matches DB + camelCase)
export const TeacherScheduleEntrySchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  timeSlot: z.number().min(1).max(TIME_SLOTS.length), // Ensure max matches length
  className: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  createdAt: z.string().optional(), // Changed from datetime()
  updatedAt: z.string().optional(), // Changed from datetime()
});

// Type for a single entry
export type TeacherScheduleEntry = z.infer<typeof TeacherScheduleEntrySchema>;

// Schema for the form (doesn't include ids or timestamps)
export const TeacherScheduleFormSchema = z.object({
  className: z.string().max(100, 'En fazla 100 karakter').nullable().optional(),
  locationName: z.string().max(100, 'En fazla 100 karakter').nullable().optional(),
});

// Type for form values
export type TeacherScheduleFormValues = z.input<typeof TeacherScheduleFormSchema>;

// Type helper for structuring data for the grid
export type TeacherScheduleGridData = {
  [day: number]: {
    [slot: number]: TeacherScheduleEntry | null;
  };
}; 