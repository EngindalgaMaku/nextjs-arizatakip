import { z } from 'zod';

// Zod Schema for LabType (matches DB table)
export const LabTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Tip adı zorunludur.').max(100),
  code: z.string().min(1, 'Kod zorunludur.').max(50),
  description: z.string().max(500).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Type inferred from the schema
export type LabType = z.infer<typeof LabTypeSchema>;

// Schema for form validation (omits generated fields)
export const LabTypeFormSchema = LabTypeSchema.omit({ id: true, created_at: true, updated_at: true });

// Type for form values
export type LabTypeFormValues = z.input<typeof LabTypeFormSchema>; 