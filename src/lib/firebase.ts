// Firebase yapılandırması
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

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
let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Client-side kod yükleme kontrolü
if (typeof window !== 'undefined') {
  firebaseApp = initializeApp(firebaseConfig);
  try {
    messaging = getMessaging(firebaseApp);
  } catch (error) {
    console.error('Messaging başlatılamadı:', error);
  }
}

// VAPID key
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * FCM için token alır ve kaydeder
 */
export const requestFCMPermission = async (userRole: string): Promise<string | null> => {
  try {
    if (!messaging) return null;

    console.log(`FCM izni isteniyor. Kullanıcı rolü: ${userRole}`);

    // İzinleri kontrol et
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Bildirim izni reddedildi');
        return null;
      }
    }

    // Service worker'ı kaydediyoruz
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('FCM için service worker kaydedildi:', registration);

      // Önce eski token varsa temizle
      try {
        const { deleteFCMToken } = await import('@/lib/supabase');
        const oldToken = localStorage.getItem('fcm_token');
        const oldRole = localStorage.getItem('fcm_user_role');
        
        // Rol değişikliği varsa eski token'ı temizle
        if (oldToken && oldRole && oldRole !== userRole) {
          console.log(`Eski token (${oldRole} rolü) temizleniyor ve ${userRole} rolü için yeni token alınıyor`);
          await registration.pushManager.getSubscription().then(sub => {
            if (sub) sub.unsubscribe();
          });
          localStorage.removeItem('fcm_token');
          localStorage.removeItem('fcm_user_role');
        }
      } catch (cleanupError) {
        console.warn('Eski token temizlenirken hata:', cleanupError);
      }

      // FCM token'ını al
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('FCM token alındı:', currentToken.substring(0, 10) + '...');
        
        // Token'ı yerel depolamaya rol bilgisiyle birlikte kaydet
        localStorage.setItem('fcm_token', currentToken);
        localStorage.setItem('fcm_user_role', userRole);
        
        // Service worker'a rol değişimini bildir
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SET_USER_ROLE',
            role: userRole
          });
        }
        
        return currentToken;
      } else {
        console.log('FCM token alınamadı');
        return null;
      }
    } else {
      console.log('Service Worker bu tarayıcıda desteklenmiyor');
      return null;
    }
  } catch (error) {
    console.error('FCM token alınırken hata:', error);
    return null;
  }
};

/**
 * FCM bildirimlerini dinler
 */
export const listenForFCMMessages = (callback: (payload: any) => void) => {
  if (!messaging) return;

  // FCM mesajlarını dinle
  return onMessage(messaging, (payload) => {
    console.log('Ön planda FCM mesajı alındı:', payload);
    callback(payload);
  });
};

export default firebaseApp; 