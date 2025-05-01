import { z } from 'zod';

export const ClassSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Sınıf adı zorunlu').max(50, 'Sınıf adı en fazla 50 karakter olabilir.'), // e.g., "10-A", "ATP 11-B"
  department: z.string().max(100, 'Alan/Dal en fazla 100 karakter olabilir.').nullable().optional(), // Optional text field
  classTeacherId: z.string().uuid('Geçerli bir öğretmen seçilmeli').optional().nullable(), // Optional FK, allow null
  classPresidentName: z.string().max(100, 'Başkan adı en fazla 100 karakter olabilir.').nullable().optional(), // Optional text field
  teacherName: z.string().nullable().optional(), // NEW: Added for teacher name from join
  displayOrder: z.number().int().positive().optional(), // NEW: Order field (optional initially, set by backend)
  // Include timestamps if you fetch/display them, otherwise they are handled by DB
  // createdAt: z.string().datetime().optional(),
  // updatedAt: z.string().datetime().optional(),
});

export type Class = z.infer<typeof ClassSchema>;
// Define input type separately if needed for forms (e.g., teacher ID might be null initially)
export type ClassFormValues = z.input<typeof ClassSchema>; 