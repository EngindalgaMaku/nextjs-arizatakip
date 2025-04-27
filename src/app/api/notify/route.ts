import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

// Firebase Admin SDK başlatma
if (!admin.apps.length) {
  try {
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Firebase admin başlatılamadı:', error);
  }
}

// Supabase istemcisi oluştur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Token veri yapısı
interface FCMToken {
  token: string;
}

// Arıza kayıt yapısı
interface IssueRecord {
  id: string;
  device_name: string;
  device_type: string;
  reported_by: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json();
    
    // Webhook verisini doğrula
    const { type, table, record, old_record } = reqBody;
    
    if (!type || !table || !record) {
      return NextResponse.json(
        { error: 'Geçersiz webhook verisi' },
        { status: 400 }
      );
    }
    
    const issueRecord = record as IssueRecord;
    
    // Yeni arıza bildirimi oluşturulduğunda
    if (type === 'INSERT' && table === 'issues') {
      // Yöneticilerin FCM tokenlarını getir
      const { data: adminUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin');
      
      if (!adminUsers || adminUsers.length === 0) {
        console.log('Yönetici kullanıcılar bulunamadı');
        return NextResponse.json({ success: false, message: 'Yönetici bulunamadı' });
      }
      
      // Yönetici ID'lerini al
      const adminIds = adminUsers.map(admin => admin.id);
      
      // Yöneticilerin FCM tokenlarını getir
      const { data: adminTokens } = await supabaseAdmin
        .from('user_fcm_tokens')
        .select('token')
        .in('user_id', adminIds);
      
      // FCM tokenlar var mı kontrol et
      if (!adminTokens || adminTokens.length === 0) {
        console.log('Bildirim gönderilecek FCM token bulunamadı');
        return NextResponse.json({ success: false, message: 'Token bulunamadı' });
      }
      
      // Bildirim içeriği
      const notification = {
        title: 'Yeni Arıza Bildirimi',
        body: `${issueRecord.reported_by} tarafından ${issueRecord.device_name} için arıza bildirimi oluşturuldu.`,
      };
      
      // FCM veri yükü
      const data = {
        issueId: issueRecord.id,
        deviceType: issueRecord.device_type,
        clickAction: 'https://atsis.husniyeozdilek.k12.tr/dashboard/issues',
        url: `/dashboard/issues?id=${issueRecord.id}`,
      };
      
      // Tokenları birleştir
      const tokens = adminTokens.map((item: FCMToken) => item.token);
      
      // Her bir token için ayrı mesaj gönderme
      let successCount = 0;
      let failureCount = 0;
      
      // Her bir token için ayrı ayrı gönder
      const sendPromises = tokens.map(async (token) => {
        const message = {
          token,
          notification,
          data,
          webpush: {
            notification: {
              ...notification,
              icon: '/okullogo.png',
              badge: '/icons/badge-128x128.png',
              actions: [
                {
                  action: 'view',
                  title: 'Görüntüle',
                },
              ],
            },
            fcmOptions: {
              link: data.url,
            },
          },
        };
        
        try {
          // Tek bir cihaza gönder
          await getMessaging().send(message);
          successCount++;
          return true;
        } catch (error) {
          console.error('Bildirim gönderme hatası:', error);
          failureCount++;
          return false;
        }
      });
      
      // Tüm gönderim işlemlerinin tamamlanmasını bekle
      await Promise.all(sendPromises);
      
      console.log(`${successCount} bildirim başarıyla gönderildi, ${failureCount} başarısız`);
      
      return NextResponse.json({
        success: true,
        sent: successCount,
        failed: failureCount,
      });
    }
    
    // Arıza durumu güncellendiğinde
    if (type === 'UPDATE' && table === 'issues' && (old_record as IssueRecord)?.status !== issueRecord.status) {
      // Bildirimi oluşturan öğretmenin FCM tokenını getir
      const { data: teacherInfo } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('name', issueRecord.reported_by)
        .single();
        
      if (!teacherInfo) {
        console.log('Bildirim sahibi öğretmen bulunamadı');
        return NextResponse.json({ success: false, message: 'Öğretmen bulunamadı' });
      }
      
      // Öğretmenin token'ını al
      const { data: teacherTokens } = await supabaseAdmin
        .from('user_fcm_tokens')
        .select('token')
        .eq('user_id', teacherInfo.id);
      
      if (!teacherTokens || teacherTokens.length === 0) {
        console.log('Öğretmen için FCM token bulunamadı');
        return NextResponse.json({ success: false, message: 'Öğretmen token bulunamadı' });
      }
      
      // Durum isimleri
      const statusNames: Record<string, string> = {
        'beklemede': 'Beklemede',
        'atandi': 'Atandı',
        'inceleniyor': 'İnceleniyor',
        'cozuldu': 'Çözüldü',
        'kapatildi': 'Kapatıldı'
      };
      
      // Bildirim içeriği
      const notification = {
        title: issueRecord.status === 'cozuldu' ? 'Arıza Kaydınız Çözüldü!' : 'Arıza Durumu Güncellendi',
        body: `"${issueRecord.device_name}" cihazı için bildiriminizin durumu "${statusNames[issueRecord.status] || issueRecord.status}" olarak güncellendi.`,
      };
      
      // FCM veri yükü
      const data = {
        issueId: issueRecord.id,
        status: issueRecord.status,
        clickAction: 'https://atsis.husniyeozdilek.k12.tr/teacher/issues',
        url: `/teacher/issues?id=${issueRecord.id}`,
      };
      
      // Tokenları birleştir
      const tokens = teacherTokens.map((item: FCMToken) => item.token);
      
      // Her bir token için ayrı mesaj gönderme
      let successCount = 0;
      let failureCount = 0;
      
      // Her bir token için ayrı ayrı gönder
      const sendPromises = tokens.map(async (token) => {
        const message = {
          token,
          notification,
          data,
          webpush: {
            notification: {
              ...notification,
              icon: '/okullogo.png',
              badge: '/icons/badge-128x128.png',
              actions: [
                {
                  action: 'view',
                  title: 'Görüntüle',
                },
              ],
            },
            fcmOptions: {
              link: data.url,
            },
          },
        };
        
        try {
          // Tek bir cihaza gönder
          await getMessaging().send(message);
          successCount++;
          return true;
        } catch (error) {
          console.error('Bildirim gönderme hatası:', error);
          failureCount++;
          return false;
        }
      });
      
      // Tüm gönderim işlemlerinin tamamlanmasını bekle
      await Promise.all(sendPromises);
      
      console.log(`${successCount} durum güncelleme bildirimi gönderildi, ${failureCount} başarısız`);
      
      return NextResponse.json({
        success: true,
        sent: successCount,
        failed: failureCount,
      });
    }
    
    return NextResponse.json({ success: true, message: 'İşlenecek bildirim bulunamadı' });
    
  } catch (error) {
    console.error('Bildirim gönderirken hata:', error);
    return NextResponse.json(
      { error: 'Bildirim gönderilemedi' },
      { status: 500 }
    );
  }
}

// CORS ön kontrolü için
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 