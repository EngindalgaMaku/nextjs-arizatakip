import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL bulunamadı. Lütfen .env.local dosyasını kontrol edin.");
}

if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key bulunamadı. Lütfen .env.local dosyasını kontrol edin.");
}

// Supabase client'ı oluştur
// Database tipini belirtmek için <Database> generic'ini kullanacağız.
// Şimdilik 'public' şemasındaki bilinen tablolar için any kullanabiliriz veya daha sonra Database arayüzünü tanımlayabiliriz.
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Veritabanı tiplerini (Database interface) tanımlayarak daha iyi tip güvenliği sağlamak için:
import { Database as GeneratedDatabase } from '@/types/supabase'; // Bu dosya Supabase CLI ile generate edilecek

// createClient fonksiyonunu Database generic type ile kullanın
export const supabase: SupabaseClient<GeneratedDatabase> = createClient<GeneratedDatabase>(
    supabaseUrl,
    supabaseAnonKey
);

// Veya, eğer 'GeneratedDatabase' tipiniz henüz yoksa ve hızlıca başlamak istiyorsanız:
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Not: GeneratedDatabase tipi, Supabase CLI kullanılarak veritabanı şemanızdan otomatik olarak oluşturulur.
// `npx supabase gen types typescript --project-id <YOUR-PROJECT-ID> --schema public > src/types/supabase.ts`
// Bu komutu projenizin Supabase proje ID'si ile çalıştırmanız gerekecektir.
// Şimdilik bu dosyanın var olduğunu varsayarak devam ediyorum, eğer yoksa aşağıdaki gibi basit bir tanım yapılabilir
// veya createClient çağrısında generic tip belirtilmeyebilir. 