'use server';

// import { createServerActionClient } from '@supabase/auth-helpers-nextjs'; // Old
import { createSupabaseServerClient } from '@/lib/supabase/server'; // New
// import { cookies } from 'next/headers'; // No longer needed here
import { z } from 'zod';

// const getSupabaseClient = () => createServerActionClient<Database>({ cookies }); // Old

export interface AdminReceiptFilter {
  studentName?: string;
  className?: string;
  schoolNumber?: string;
  businessName?: string;
  month?: number;
  year?: number;
  page?: number;
  pageSize?: number;
}

export interface AdminReceiptListItem {
  id: string;
  student_name: string | null;
  student_school_number: string | null;
  student_class_name: string | null;
  business_name: string | null;
  month: number;
  year: number;
  file_path: string;
  file_name_original: string | null;
  notes: string | null;
  uploaded_at: string; 
}

export async function getReceiptsForAdmin(filters: AdminReceiptFilter): Promise<{
  data: AdminReceiptListItem[] | null;
  error: string | null;
  count: number | null;
}> {
  const supabase = createSupabaseServerClient(); // New
  const { 
    studentName, className, schoolNumber, 
    businessName, month, year, 
    page = 1, pageSize = 10 
  } = filters;

  try {
    let query = supabase
      .from('receipts')
      .select(`
        id,
        month,
        year,
        file_path,
        file_name_original,
        notes,
        uploaded_at,
        students (
          name,
          school_number,
          classes (name)
        ),
        staj_isletmeleri (name)
      `, { count: 'exact' }); 

    if (studentName) {
      query = query.ilike('students.name', `%${studentName}%`);
    }
    if (schoolNumber) {
      query = query.eq('students.school_number', schoolNumber);
    }
    if (className) {
      // @ts-ignore: Supabase JS client might not perfectly type nested foreign table queries for ilike
      query = query.ilike('students.classes.name', `%${className}%`);
    }
    if (businessName) {
      query = query.ilike('staj_isletmeleri.name', `%${businessName}%`);
    }

    // Academic Year and Specific Month/Year Filtering Logic
    if (year && !month) { // Year is selected, but no specific month (interpret as academic year)
      query = query.or(`and(month.gte.9,month.lte.12,year.eq.${year}),and(month.gte.1,month.lte.6,year.eq.${year + 1})`);
    } else if (year && month) { // Specific year and month are selected
      query = query.eq('year', year).eq('month', month);
    } else if (month) { // Only month is selected (filters by this month across all years - current behavior if year not set)
      query = query.eq('month', month);
    }
    // If neither year nor month is selected, no date filtering is applied (fetches all)

    const startIndex = (page - 1) * pageSize;
    query = query.range(startIndex, startIndex + pageSize - 1);
    query = query.order('uploaded_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching receipts for admin:', error);
      return { data: null, error: 'Dekontlar alınırken bir hata oluştu: ' + error.message, count: null };
    }

    const formattedData: AdminReceiptListItem[] = data.map((item: any) => ({
      id: item.id,
      student_name: item.students?.name || null,
      student_school_number: item.students?.school_number || null,
      student_class_name: item.students?.classes?.name || null,
      business_name: item.staj_isletmeleri?.name || null,
      month: item.month,
      year: item.year,
      file_path: item.file_path,
      file_name_original: item.file_name_original || null,
      notes: item.notes || null,
      uploaded_at: new Date(item.uploaded_at).toLocaleDateString('tr-TR'),
    }));

    return { data: formattedData, error: null, count };

  } catch (e: any) {
    console.error('Unexpected error in getReceiptsForAdmin:', e);
    return { data: null, error: 'Dekontlar alınırken beklenmedik bir hata oluştu: ' + e.message, count: null };
  }
}

export async function getReceiptDownloadUrl(
  filePath: string,
  expiresIn: number = 3600 
): Promise<{ data: { downloadUrl: string } | null; error: string | null }> {
  const supabase = createSupabaseServerClient(); // New
  const validation = z.string().min(1).safeParse(filePath);

  if (!validation.success) {
    return { data: null, error: 'Geçersiz dosya yolu.' };
  }

  try {
    const { data, error } = await supabase.storage
      .from('student-receipts') 
      .createSignedUrl(validation.data, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return { data: null, error: 'İndirme linki oluşturulurken bir hata oluştu: ' + error.message };
    }

    return { data: { downloadUrl: data.signedUrl }, error: null };

  } catch (e: any) {
    console.error('Unexpected error in getReceiptDownloadUrl:', e);
    return { data: null, error: 'İndirme linki oluşturulurken beklenmedik bir hata oluştu: ' + e.message };
  }
}

// Schema for validating receipt update data
const updateReceiptSchema = z.object({
  receiptId: z.string().min(1, "Dekont ID gereklidir."),
  month: z.number().min(1, "Ay 1-12 arasında olmalıdır.").max(12, "Ay 1-12 arasında olmalıdır."),
  year: z.number().min(2000, "Yıl 2000'den büyük olmalıdır.").max(2100, "Yıl 2100'den küçük olmalıdır."),
  notes: z.string().max(500, "Notlar 500 karakterden fazla olamaz.").nullable().optional(),
});

export type UpdateAdminReceiptPayload = z.infer<typeof updateReceiptSchema>;

export async function updateAdminReceipt(
  payload: UpdateAdminReceiptPayload
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  const validation = updateReceiptSchema.safeParse(payload);

  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { receiptId, month, year, notes } = validation.data;

  try {
    const { data, error } = await supabase
      .from('receipts')
      .update({
        month,
        year,
        notes: notes,
        // updated_at is usually handled by the database automatically
      })
      .eq('id', receiptId)
      .select('id')
      .single(); // Expect a single record to be updated and returned

    if (error) {
      console.error('Error updating receipt:', error);
      return { data: null, error: 'Dekont güncellenirken bir hata oluştu: ' + error.message };
    }

    if (!data) {
      return { data: null, error: 'Dekont bulunamadı veya güncellenemedi.' };
    }

    return { data: { id: data.id }, error: null };

  } catch (e: any) {
    console.error('Unexpected error in updateAdminReceipt:', e);
    return { data: null, error: 'Dekont güncellenirken beklenmedik bir hata oluştu: ' + e.message };
  }
} 