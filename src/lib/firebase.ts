// Firebase yapılandırması
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { deleteFCMToken, saveFCMToken } from './supabase';

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyDCpkjyNxxrzTn3rXM1kuH5zn0pgIORi0g",
  authDomain: "atsis-38f7e.firebaseapp.com",
  projectId: "atsis-38f7e",
  storageBucket: "atsis-38f7e.firebasestorage.app",
  messagingSenderId: "943049988733",
  appId: "1:943049988733:web:e8c073b8760198da65ef14"
};

// Firebase başlatma
export const firebaseApp = initializeApp(firebaseConfig);

// Tarayıcı kontrolü
const isBrowser = typeof window !== 'undefined';

/**
 * Firebase Cloud Messaging'i başlat ve token al
 * @param saveFCMTokenFn Token kaydetme fonksiyonu
 * @param userId Kullanıcı ID
 * @param userRole Kullanıcı rolü
 * @returns 
 */
export async function initializeFirebaseMessaging(
  saveFCMTokenFn: (userId: string, token: string, userRole?: string) => Promise<any>,
  userId: string,
  userRole: string
) {
  if (!isBrowser) return null;

  try {
    // Service worker kaydı
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        
        console.log('Service Worker başarıyla kaydedildi:', registration.scope);
        
        // Service worker hazır olduğunda
        await navigator.serviceWorker.ready;
        console.log('Service Worker artık hazır');
      } catch (error) {
        console.error('Service Worker kaydı başarısız:', error);
        return null;
      }
    }

    // FCM desteği kontrolü
    const isMessagingSupported = await isSupported();
    if (!isMessagingSupported) {
      console.log('Firebase Cloud Messaging bu tarayıcıda desteklenmiyor');
      return null;
    }

    // Messaging nesnesi oluştur
    const messaging = getMessaging(firebaseApp);
    
    // İzin iste ve token al
    try {
      console.log('FCM izinleri isteniyor...');
      
      const permission = await Notification.requestPermission();
      console.log('Bildirim izin durumu:', permission);
      
      if (permission !== 'granted') {
        console.log('Bildirim izni reddedildi');
        return null;
      }
      
      // Token al
      console.log('FCM token alınıyor...');
      const token = await getToken(messaging, {
        vapidKey: 'BBXCgNXccb-2nRV9Tm5NQXx0gXKgDFt1_exf3RhI6IgNn5FnMOrcKXKpY55D3l9YS-U_FtLm5fX_1xgfWPeYtWs',
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      });
      
      console.log('FCM token alındı:', token);

      // Token kaydet
      if (token) {
        await saveFCMTokenFn(userId, token, userRole);
      }

      return { messaging, token };
    } catch (error) {
      console.error('FCM token alınırken hata:', error);
      return null;
    }
  } catch (error) {
    console.error('Firebase başlatılırken hata:', error);
    return null;
  }
}

/**
 * Mesaj dinleyicisi kur
 * @param messaging Firebase Messaging nesnesi
 * @param callback Mesaj alındığında çalışacak fonksiyon
 */
export function setupMessageListener(
  messaging: any,
  callback: (payload: any) => void
) {
  if (!isBrowser || !messaging) return;
  
  console.log('Mesaj dinleyicisi kuruldu');
  
  return onMessage(messaging, (payload) => {
    console.log('Ön planda mesaj alındı:', payload);
    callback(payload);
  });
}

// Service Worker'a rol bilgisini gönder
export const sendRoleToServiceWorker = async (role: string): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker bu tarayıcıda desteklenmiyor.');
      return false;
    }

    // Service worker controller kontrolü
    if (navigator.serviceWorker.controller === null) {
      console.log('Service worker henüz aktif değil, rol bilgisi gönderilemedi');
      // Service worker hazır olduğunda rol bilgisini gönder
      await navigator.serviceWorker.ready;
      
      // Controller hala null ise, rol gönderme işlemini belirli aralıklarla tekrar dene
      if (navigator.serviceWorker.controller === null) {
        console.log('Service worker controller hala null, rol gönderilemedi');
        return false;
      }
    }

    // Service worker'a rol bilgisini gönder
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_USER_ROLE',
      role
    });
    
    console.log(`Kullanıcı rolü (${role}) service worker'a gönderildi`);
    return true;
  } catch (error) {
    console.error('Service worker\'a rol gönderirken hata:', error);
    return false;
  }
};

// FCM tokenını temizle (çıkış yapma vb. durumlarda)
export const clearFCMToken = async (): Promise<boolean> => {
  try {
    // localStorage'daki token ve kullanıcı bilgilerini sil
    const token = localStorage.getItem('fcm_token');
    const userId = localStorage.getItem('fcm_user_id');
    
    if (token && userId) {
      // Token'ı veritabanından sil
      await deleteFCMToken(userId);
    }
    
    // localStorage'dan temizle
    localStorage.removeItem('fcm_token');
    localStorage.removeItem('fcm_user_id');
    localStorage.removeItem('fcm_user_role');
        
    console.log('FCM token temizlendi');
    return true;
  } catch (error) {
    console.error('FCM token temizlenirken hata:', error);
    return false;
  }
};

// FCM izinlerini iste ve token al
export async function requestFCMPermission(userId: string, userRole: string): Promise<string | null> {
  try {
    if (!isBrowser) return null;

    // Tarayıcı bildirim API'sini kontrol et
    if (!("Notification" in window)) {
      console.error("Bu tarayıcı bildirim desteği sunmuyor");
      return null;
    }

    // İzin kontrolü
    if (Notification.permission === "denied") {
      console.warn("Bildirim izni reddedilmiş durumda");
      return null;
    }

    // FCM desteği kontrolü
    const isMessagingSupported = await isSupported();
    if (!isMessagingSupported) {
      console.warn("Firebase Cloud Messaging bu tarayıcıda desteklenmiyor");
      return null;
    }

    // Service worker kaydı
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        console.log('Service Worker kaydedildi:', registration);
      } catch (err) {
        console.error('Service Worker kaydı başarısız:', err);
        return null;
      }
    } else {
      console.warn('Service Worker bu tarayıcıda desteklenmiyor');
      return null;
    }

    // Messaging nesnesi
    const messaging = getMessaging(firebaseApp);

    // İzin iste
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Bildirim izni verilmedi');
      return null;
    }

    // Token al
    const token = await getToken(messaging, {
      vapidKey: 'BBXCgNXccb-2nRV9Tm5NQXx0gXKgDFt1_exf3RhI6IgNn5FnMOrcKXKpY55D3l9YS-U_FtLm5fX_1xgfWPeYtWs',
    });

    if (!token) {
      console.error('FCM token alınamadı');
      return null;
    }

    console.log('FCM token alındı:', token);

    // Token'ı kaydet
    const result = await saveFCMToken(userId, token, userRole);
    if (!result || result.error) {
      console.error('Token kaydedilemedi:', result?.error);
    }

    return token;
  } catch (error) {
    console.error('FCM izni alınırken hata:', error);
    return null;
  }
}

export default firebaseApp; 