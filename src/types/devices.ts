// admin/src/types/devices.ts
import { z } from 'zod';
import { PropertyField, PropertyFieldSchema, Location } from './locations'; // Keep Location import if needed for joins

// Define the structure for a Device
export interface Device {
  id: string; // uuid
  name: string;
  type: string | null; // e.g., 'akilli_tahta', 'bilgisayar'
  serial_number: string | null;
  location_id: string | null; // Foreign key to locations table
  barcode_value: string | null; // Added barcode value field
  properties: PropertyField[] | null; // Use Key-Value structure like locations
  purchase_date: string | null; // ISO date string (YYYY-MM-DD from form)
  warranty_expiry_date: string | null; // ISO date string (YYYY-MM-DD from form)
  status: string | null; // e.g., 'aktif', 'arizali', 'bakimda'
  notes: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  location?: Location | null; // Optional relation data if joined
}

// Zod schema for creating/updating a device
export const DeviceSchema = z.object({
  name: z.string().min(3, 'Cihaz adı en az 3 karakter olmalıdır.'),
  type: z.string().min(1, 'Cihaz tipi seçilmelidir.').nullable(), // Type is required now in form
  serial_number: z.string().nullable().optional(),
  location_id: z.string().uuid('Geçerli bir konum seçilmelidir.').nullable().optional(), // Validate UUID if provided
  properties: z.array(PropertyFieldSchema).nullable().optional().default([]),
  purchase_date: z.string().nullable().optional(),
  warranty_expiry_date: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // barcode_value is generated, not part of the form
});

// Type inferred from the schema for form validation
export type DeviceFormData = z.infer<typeof DeviceSchema>;

// Define allowed device types (can be moved to constants later)
export const deviceTypes = [
    { value: 'desktop', label: 'Masaüstü Bilgisayar' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'printer', label: 'Yazıcı' },
    { value: 'smartboard', label: 'Akıllı Tahta' },
    { value: 'other', label: 'Diğer' }
];

// Helper function to get device type label
export function getDeviceTypeLabel(value: string | null | undefined): string {
    if (!value) return 'Bilinmiyor';
    return deviceTypes.find(dt => dt.value === value)?.label || value;
} 