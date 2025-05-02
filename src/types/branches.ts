import { z } from 'zod';

// Schema for the Branch object in the database (matching table structure)
export const BranchDbSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Branş adı zorunludur.'),
  created_at: z.string().datetime().optional(), // Or z.date() if transformed
  updated_at: z.string().datetime().optional(), // Or z.date()
});

// Schema for validating the branch creation form
export const BranchFormSchema = z.object({
  name: z.string().min(1, 'Branş adı zorunludur.'),
});

// Type for the Branch object (matching DB structure for read operations)
// Note: We are using the interface defined in teacherActions for now,
// but ideally, this should be the source of truth.
// export type Branch = z.infer<typeof BranchDbSchema>;

// Type for the form values used when creating/editing a branch
export type BranchFormValues = z.infer<typeof BranchFormSchema>; 