// Firebase yapılandırması
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported,
  deleteToken,
  Messaging
} from 'firebase/messaging';
import { deleteFCMToken, saveFCMToken } from './supabase';

// FCM yapılandırması
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase ve messaging örneklerini oluştur
let firebaseApp: FirebaseApp | undefined;
if (typeof window !== 'undefined' && !getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
}

// VAPID key
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * FCM için token alır ve kaydeder
 */
export const requestFCMPermission = async (userId: string, userRole: string): Promise<string | null> => {
  try {
    if (typeof window === 'undefined') {
      console.warn('FCM izinleri istenirken hata: Window nesnesi bulunamadı (server-side)');
      return null;
    }

    // FCM ve bildirim desteğini kontrol et
    const isMessagingSupported = await isSupported();
    if (!isMessagingSupported) {
      console.warn('Firebase Cloud Messaging bu tarayıcıda desteklenmiyor.');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('Bu tarayıcı bildirim desteği sağlamıyor.');
      return null;
    }

    // Bildirim izni kontrolü
    let permission = Notification.permission;
    
    if (permission === 'default') {
      console.log('Bildirim izni isteniyor...');
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.warn('Bildirim izni reddedildi veya istenirken hata oluştu.');
      return null;
    }

    console.log('Bildirim izni alındı, FCM token isteniyor...');

    // Servis çalışanlarını kaydet
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker bu tarayıcıda desteklenmiyor.');
      return null;
    }

    try {
      // Token iste
      const messaging = getMessaging(firebaseApp);
      
      // VAPID key ile token al (Web Push API için)
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      
      if (!token) {
        console.warn('FCM token alınamadı. VAPID key veya izinler kontrol edilmeli.');
        return null;
      }

      console.log('FCM token başarıyla alındı:', token);
      
      // Kullanıcı bilgisini ve rolünü localStorage'a kaydet
      localStorage.setItem('fcm_token', token);
      localStorage.setItem('fcm_user_id', userId);
      localStorage.setItem('fcm_user_role', userRole);
      
      // Service worker'a rol bilgisini gönder
      await sendRoleToServiceWorker(userRole);
      
      return token;
    } catch (error) {
      console.error('FCM token alınırken hata:', error);
      return null;
    }
  } catch (error) {
    console.error('FCM izinleri istenirken hata:', error);
    return null;
  }
};

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

/**
 * FCM bildirimlerini dinler
 */
export const listenForFCMMessages = (callback: (payload: any) => void) => {
  // Messaging desteklenmiyor ise erken dön
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service worker veya FCM bu ortamda desteklenmiyor');
    return;
  }
  
  // Mesajlaşma servisini al
  const messaging = getMessaging(firebaseApp);
  
  try {
    // Foreground mesajları dinle
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground mesajı alındı:', payload);
      
      // Rol kontrolü
      const userRole = localStorage.getItem('fcm_user_role') || 'anonymous';
      const messageRole = payload.data?.userRole;
      
      // Rol kontrolü yap - eğer mesaj bu kullanıcının rolü için değilse işleme
      if (messageRole && messageRole !== userRole && userRole !== 'admin') {
        console.log(`Bu bildirim ${messageRole} rolü için, kullanıcı ${userRole} rolünde. Bildirim gösterilmeyecek.`);
        return;
      }
      
      // Geri çağırma ile mesajı işle
      callback(payload);
    });
    
    // Temizlik fonksiyonunu döndür (komponent unmount olduğunda çağrılabilir)
    return unsubscribe;
  } catch (error) {
    console.error('FCM mesaj dinleme hatası:', error);
    return () => {}; // Boş temizlik fonksiyonu
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
    
    // Service worker'a anonim rol bilgisini gönder
    await sendRoleToServiceWorker('anonymous');
    
    console.log('FCM token temizlendi');
    return true;
  } catch (error) {
    console.error('FCM token temizlenirken hata:', error);
    return false;
  }
};

export default firebaseApp; 