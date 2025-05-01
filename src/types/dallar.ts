import { z } from 'zod';

// Schema for a Branch/Department - Represents the full DB object
export const DalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Dal adı zorunludur.').max(100, 'Dal adı en fazla 100 karakter olabilir.'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir.').nullable().optional(),
  createdAt: z.string().optional(), // from DB
  updatedAt: z.string().optional(), // from DB
});

// Schema for form validation (omits generated fields)
export const DalFormSchema = DalSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Type for the full Branch object
export type Dal = z.infer<typeof DalSchema>;

// Type for form values
export type DalFormValues = z.input<typeof DalFormSchema>; 