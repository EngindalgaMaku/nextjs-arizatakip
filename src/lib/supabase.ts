import { createClient } from '@supabase/supabase-js';

// .env.local'den ortam değişkenleri
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcxbfmqyvqchcrudxpmh.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeGJmbXF5dnFjaGNydWR4cG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzQ5NTcsImV4cCI6MjA2MDc1MDk1N30.ZVAsgNkAWqtSpEgUufOdvegyXVeN5H6fXYA7rn-8osQ";

// Demo modunu kontrol et - Supabase bağlantısı yoksa true yapın
export const DEMO_MODE = false;

// Supabase istemcisini oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
  last_login: string | null;
  status: 'active' | 'inactive';
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

// Arıza durumu için tip
export type IssueStatus = 'beklemede' | 'atandi' | 'inceleniyor' | 'cozuldu' | 'kapatildi';

// Arıza önceliği için tip
export type IssuePriority = 'dusuk' | 'normal' | 'yuksek' | 'kritik';

// Cihaz tipi için tip
export type DeviceType = 'akilli_tahta' | 'bilgisayar' | 'yazici' | 'projektor' | 'diger';

// Cihaz konumu için tip
export type DeviceLocation = 'sinif' | 'laboratuvar' | 'idare' | 'ogretmenler_odasi' | 'diger';

// Arıza ekleme için veri tipi
export interface IssueData {
  device_type: DeviceType;
  device_name: string;
  device_location: DeviceLocation;
  room_number: string;
  description: string;
  reported_by: string;
  status: IssueStatus;
  priority: IssuePriority;
}

// Arıza kaydı tipi
export type Issue = {
  id: string;
  device_type: DeviceType;
  device_name: string;
  device_location: DeviceLocation;
  room_number: string;
  reported_by: string;
  assigned_to: string | null;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
};

// Sistem ayarları türü
export type SystemSettings = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  updated_by: string | null;
};

// Öğretmen giriş kodu ayar anahtarı
export const TEACHER_ACCESS_CODE_KEY = 'teacher_access_code';

// Auth fonksiyonları
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function registerUser(email: string, password: string, userData: Partial<User>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  });
  
  if (error) throw error;
  
  // Yeni kayıt başarılı olduysa kullanıcı tablosuna da kaydet
  if (data.user) {
    await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      name: userData.name,
      role: userData.role || 'viewer',
      status: 'active'
    });
  }
  
  return data;
}

export async function updateUserProfile(userId: string, userData: Partial<User>) {
  // Auth metadata güncelleme
  const { error: metadataError } = await supabase.auth.updateUser({
    data: userData
  });
  
  if (metadataError) throw metadataError;
  
  // Kullanıcı tablosunu güncelleme
  return supabase.from('users').update(userData).eq('id', userId);
}

// Example database functions
export async function getUsers() {
  return supabase.from('users').select('*');
}

export async function getUser(id: string) {
  return supabase.from('users').select('*').eq('id', id).single();
}

export async function updateUser(id: string, data: Partial<User>) {
  return supabase.from('users').update(data).eq('id', id);
}

export async function deleteUser(id: string) {
  return supabase.from('users').delete().eq('id', id);
}

// Arıza İşlemleri
export async function getIssues(filters?: Partial<Issue>) {
  try {
    let query = supabase.from('issues').select('*');
    
    // Filtreler uygulanıyor
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });
    }
    
    const result = await query.order('created_at', { ascending: false });
    
    // Supabase hatası durumunda
    if (result.error) {
      // PostgreSQL hata kodlarına göre daha spesifik hata mesajları
      if (result.error.code === '42P01') {
        // Tablo bulunamadı hatası
        console.error('Issues tablosu veritabanında bulunamadı. Tablo oluşturuldu mu?');
      } else if (result.error.code === '42501') {
        // Yetki hatası
        console.error('Issues tablosuna erişim yetkisi yok. RLS politikaları kontrol edin.');
      }
      
      throw new Error(`Veritabanı hatası: ${result.error.message}`);
    }
    
    return result;
  } catch (error) {
    console.error('getIssues hatası:', error);
    throw error;
  }
}

export async function getIssue(id: string) {
  try {
    const result = await supabase.from('issues').select('*').eq('id', id).single();
    
    if (result.error) {
      if (result.error.code === 'PGRST116') {
        // Kayıt bulunamadı hatası
        console.error('Belirtilen ID ile arıza kaydı bulunamadı:', id);
        return { data: null, error: new Error('Arıza kaydı bulunamadı') };
      }
      
      // Diğer hatalar
      console.error('Arıza detayları getirilirken hata:', result.error);
      throw result.error;
    }
    
    return result;
  } catch (error) {
    console.error('getIssue hatası:', error);
    throw error;
  }
}

export async function createIssue(data: Omit<Issue, 'id' | 'created_at' | 'updated_at'>) {
  const newIssue = {
    ...data,
    created_at: new Date().toISOString(),
  };
  return supabase.from('issues').insert(newIssue).select().single();
}

export async function updateIssue(id: string, data: Partial<Issue>) {
  const updatedData = {
    ...data,
    updated_at: new Date().toISOString(),
    ...(data.status === 'cozuldu' && !data.resolved_at ? { resolved_at: new Date().toISOString() } : {})
  };
  
  return supabase.from('issues').update(updatedData).eq('id', id);
}

export async function deleteIssue(id: string) {
  return supabase.from('issues').delete().eq('id', id);
}

// Arıza ekleme fonksiyonu
export async function addIssue(issueData: IssueData) {
  const { data, error } = await supabase
    .from('issues')
    .insert([
      {
        ...issueData,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  return { data, error };
}

// Öğretmen için arızaları getirme fonksiyonu
export async function getIssuesForTeacher(teacherName: string) {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('reported_by', teacherName)
    .order('created_at', { ascending: false });

  return { data, error };
}

// Tüm arızaları getirme fonksiyonu
export async function getAllIssues() {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
}

// Diğer işlevler (eski)
// Products
export async function getProducts() {
  return supabase.from('products').select('*');
}

export async function getProduct(id: string) {
  return supabase.from('products').select('*').eq('id', id).single();
}

export async function createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('products').insert(data).select().single();
}

export async function updateProduct(id: string, data: Partial<Product>) {
  return supabase.from('products').update(data).eq('id', id);
}

export async function deleteProduct(id: string) {
  return supabase.from('products').delete().eq('id', id);
}

// Orders
export async function getOrders() {
  return supabase.from('orders').select('*');
}

export async function getOrder(id: string) {
  return supabase.from('orders').select('*').eq('id', id).single();
}

export async function createOrder(data: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('orders').insert(data).select().single();
}

export async function updateOrder(id: string, data: Partial<Order>) {
  return supabase.from('orders').update(data).eq('id', id);
}

export async function deleteOrder(id: string) {
  return supabase.from('orders').delete().eq('id', id);
}

// Sistem ayarlarını getir
export async function getSystemSettings() {
  return supabase.from('settings').select('*');
}

// Belirli bir ayarı getir
export async function getSystemSetting(key: string) {
  return supabase
    .from('settings')
    .select('*')
    .eq('key', key)
    .single();
}

// Öğretmen giriş kodunu getir
export async function getTeacherAccessCode() {
  try {
    if (DEMO_MODE) {
      // Demo modda localStorage'dan al
      if (typeof window !== 'undefined') {
        const storedCode = localStorage.getItem(TEACHER_ACCESS_CODE_KEY);
        if (storedCode) {
          return storedCode;
        }
      }
      // Varsayılan değer
      return '12345';
    } else {
      // Supabase'den al
      const { data, error } = await getSystemSetting(TEACHER_ACCESS_CODE_KEY);
      
      if (error) {
        console.error('Öğretmen giriş kodu alınırken hata:', error);
        return '12345'; // Varsayılan değer
      }
      
      return data?.value || '12345';
    }
  } catch (err) {
    console.error('Öğretmen giriş kodu getirilirken hata:', err);
    return '12345'; // Hata durumunda varsayılan değer
  }
}

// Sistem ayarını güncelle
export async function updateSystemSetting(key: string, value: string, userId: string) {
  try {
    if (DEMO_MODE) {
      // Demo modda sadece localStorage'a kaydet
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return { data: { key, value }, error: null };
    } else {
      // Supabase'e kaydet
      const { data: existingData, error: checkError } = await getSystemSetting(key);
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116: Sonuç bulunamadı hatası
        throw checkError;
      }
      
      if (existingData) {
        // Mevcut ayarı güncelle
        return supabase
          .from('settings')
          .update({
            value,
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('key', key);
      } else {
        // Yeni ayar oluştur
        return supabase
          .from('settings')
          .insert({
            key,
            value,
            description: key === TEACHER_ACCESS_CODE_KEY ? 'Öğretmen giriş kodu' : null,
            created_at: new Date().toISOString(),
            updated_by: userId
          });
      }
    }
  } catch (err) {
    console.error('Ayar güncellenirken hata:', err);
    throw err;
  }
} 