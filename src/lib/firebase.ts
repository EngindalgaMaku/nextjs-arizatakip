// Firebase yapılandırması
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
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

// Firebase başlatma - singleton pattern
let firebaseAppInstance: FirebaseApp | undefined = undefined;
export const firebaseApp = (): FirebaseApp => {
  if (!firebaseAppInstance && typeof window !== 'undefined') {
    firebaseAppInstance = initializeApp(firebaseConfig);
  }
  return firebaseAppInstance as FirebaseApp;
};

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
    const messaging = getMessaging(firebaseApp());
    
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
        vapidKey: "BH5kBlbDmaRPQuJZ3wrNGCcCmQyqNaZaYtwOXzFOKRmhoKPfQ4ng67pIasoVjNBWPXb4CTUo4X6T2AsGADWYy7s",
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

// Mesaj dinleyicisi kur
export function setupMessageListener(
  messaging: Messaging,
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

    // Service worker işlemleri
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker bu tarayıcıda desteklenmiyor');
      return null;
    }

    // Önce service worker'ı kontrol et
    let registration;
    try {
      registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      
      // Service worker yoksa veya güncellenmesi gerekiyorsa kaydet
      if (!registration) {
        console.log('Service Worker kaydediliyor...');
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Service Worker kaydedildi:', registration);
      } else {
        console.log('Mevcut Service Worker bulundu:', registration);
      }

      // Service worker hazır oluncaya kadar bekle
      await navigator.serviceWorker.ready;
      console.log('Service Worker hazır');
      
    } catch (err) {
      console.error('Service Worker kaydı başarısız:', err);
      return null;
    }

    // İzin iste
    let permission: NotificationPermission = Notification.permission;
    if (permission !== 'granted') {
      console.log('Bildirim izni isteniyor...');
      try {
        permission = await Notification.requestPermission();
        console.log('Bildirim izni sonucu:', permission);
      } catch (error) {
        console.error('Bildirim izni istenirken hata:', error);
        return null;
      }
    }
    
    // Sadece permission granted ise devam et
    if (permission !== 'granted') {
      console.warn('Bildirim izni verilmedi');
      return null;
    }

    // Token al
    console.log('FCM token alınıyor...');
    try {
      // Uygulama ve messaging kontrolü
      const app = firebaseApp();
      if (!app) {
        console.error('Firebase uygulaması bulunamadı');
        return null;
      }
      
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: "BH5kBlbDmaRPQuJZ3wrNGCcCmQyqNaZaYtwOXzFOKRmhoKPfQ4ng67pIasoVjNBWPXb4CTUo4X6T2AsGADWYy7s",
        serviceWorkerRegistration: registration
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
    } catch (tokenError) {
      console.error('Token alınırken hata:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('FCM izni alınırken hata:', error);
    return null;
  }
}

export default firebaseApp; 