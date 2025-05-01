import { z } from 'zod';

export const ClassSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Sınıf adı zorunlu'), // e.g., "10-A", "ATP 11-B"
  department: z.string().optional().or(z.literal('')), // Optional text field
  classTeacherId: z.string().uuid('Geçerli bir öğretmen seçilmeli').optional().nullable(), // Optional FK, allow null
  classPresidentName: z.string().optional().or(z.literal('')), // Optional text field
  // Include timestamps if you fetch/display them, otherwise they are handled by DB
  // createdAt: z.string().datetime().optional(),
  // updatedAt: z.string().datetime().optional(),
});

export type Class = z.infer<typeof ClassSchema>;
// Define input type separately if needed for forms (e.g., teacher ID might be null initially)
export type ClassFormValues = z.input<typeof ClassSchema>; 