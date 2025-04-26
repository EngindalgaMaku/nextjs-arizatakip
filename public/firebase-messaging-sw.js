// Firebase Messaging Service Worker

// Firebase versiyonları - güncellemeden sonra bunları doğru versiyon numaralarına güncellemeniz gerekebilir
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// FCM yapılandırması - bu değerler frontend ile aynı olmalı
firebase.initializeApp({
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY_BURADA',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_BURADA',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID_BURADA',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_BURADA',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_BURADA',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID_BURADA',
});

// Firebase Messaging nesnesini al
const messaging = firebase.messaging();

// Arkaplanda bildirim alındığında
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Arkaplanda mesaj alındı ', payload);
  
  // Bildirim başlığı ve içeriği
  const notificationTitle = payload.notification?.title || 'Yeni Bildirim';
  const notificationOptions = {
    body: payload.notification?.body || 'Yeni bir bildiriminiz var.',
    icon: '/okullogo.png',
    badge: '/icons/badge-128x128.png',
    data: payload.data,
    // Bildirim tıklandığında açılacak URL
    // FCM ile birlikte click_action parametresi kullanılabilir
    tag: 'atsis-notification',
  };

  // Bildirim gösterme
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Bildirime tıklandı ', event);
  
  // Bildirimi kapat
  event.notification.close();
  
  // URL varsa tarayıcıyı aç ve o sayfaya yönlendir
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  // Tüm istemcileri kontrol et
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Açık bir pencere varsa onu kullan
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          // Açık bir sekme varsa onu öne getir ve URL'e yönlendir
          if (client.url && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // Açık bir pencere yoksa yeni bir tane aç
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Service worker kurulum aşaması
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker kuruldu');
  self.skipWaiting(); // Yeni service worker'ın hemen aktif olmasını sağlar
});

// Service worker aktifleşme aşaması
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker aktifleşti');
  // Tüm istemciler üzerinde kontrol sahibi ol
  event.waitUntil(clients.claim());
}); 