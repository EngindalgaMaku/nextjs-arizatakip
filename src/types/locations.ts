// admin/src/types/locations.ts
import { z } from 'zod'; // Import Zod here

// Define the structure for a single property object within the array
export interface PropertyField {
  key: string;
  value: any; // Keep value flexible
}

export interface Location {
  id: string; // uuid
  name: string;
  type: string | null; // 'laboratuvar', 'sinif', 'idare', etc.
  department: string | null; // Add department field
  barcode_value: string | null;
  description: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  properties: PropertyField[] | null; // Changed to array of PropertyField
  sort_order: number | null; // Add sort_order field
}

// Zod schema for a single property object
// Export this schema as well
export const PropertyFieldSchema = z.object({
    key: z.string().min(1, 'Özellik adı boş olamaz.'), // Add basic validation
    value: z.any(), // Keep value flexible
});

// Zod schema for creating/updating a location
export const LocationSchema = z.object({
  name: z.string().min(3, 'Konum adı en az 3 karakter olmalıdır.'),
  type: z.string().nullable().optional(),
  department: z.string().nullable().optional(), // Add department field to schema
  description: z.string().nullable().optional(),
  // Update properties to be an array of the PropertyFieldSchema
  properties: z.array(PropertyFieldSchema).optional().default([]),
});

// Type inferred from the schema for form validation
export type LocationFormData = z.infer<typeof LocationSchema>; 