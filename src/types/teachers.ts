import { z } from 'zod';

// Define allowed roles
const TeacherRoleEnum = z.enum(['alan_sefi', 'atolye_sefi', 'ogretmen']);

// Basic schema for a teacher - represents the full DB object
export const TeacherSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Öğretmen adı zorunlu'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD formatında').optional().or(z.literal('')).nullable(), // Optional date string, allow null
  role: TeacherRoleEnum.optional().nullable(), // Optional role, allow null
  phone: z.string().optional().or(z.literal('')).nullable(), // Add optional phone
  // email: z.string().email().optional(),
  // other fields...
});

// Schema for validating form input (ID is not needed/provided by user)
export const TeacherFormSchema = TeacherSchema.omit({ id: true });

// Type for the full teacher object
export type Teacher = z.infer<typeof TeacherSchema>;

// Define form values type based on the form schema
export type TeacherFormValues = z.input<typeof TeacherFormSchema>;

// Define role type for dropdown options etc.
export type TeacherRole = z.infer<typeof TeacherRoleEnum>;
export const teacherRoles: TeacherRole[] = ['alan_sefi', 'atolye_sefi', 'ogretmen']; // Export roles for UI
// Map roles to display names
export const teacherRoleLabels: Record<TeacherRole, string> = {
  alan_sefi: 'Alan Şefi',
  atolye_sefi: 'Atölye Şefi',
  ogretmen: 'Öğretmen',
}; 