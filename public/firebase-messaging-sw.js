// Firebase Messaging Service Worker

// Firebase versiyonları
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// Firebase yapılandırmasını yerleştirin
// NOT: Bu değerleri .env dosyasından alamayız, çünkü service worker'lar doğrudan bunlara erişemez
// Bu nedenle, build zamanında veya manuel olarak güncellenmelidir
const firebaseConfig = {
  apiKey: "AIzaSyDCpkjyNxxrzTn3rXM1kuH5zn0pgIORi0g",
  authDomain: "atsis-38f7e.firebaseapp.com",
  projectId: "atsis-38f7e",
  storageBucket: "atsis-38f7e.firebasestorage.app",
  messagingSenderId: "943049988733",
  appId: "1:943049988733:web:e8c073b8760198da65ef14"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Console'a hata ayıklama mesajı
console.log('[Service Worker] Firebase Service Worker başlatıldı');

// Arka planda mesaj alındığında
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı:', payload);
  
  const notificationTitle = payload.notification?.title || 'ATSİS Bildirim';
  const notificationOptions = {
    body: payload.notification?.body || 'Yeni bir bildiriminiz var',
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data || {},
    tag: payload.data?.issueId || 'general',
    requireInteraction: true
  };

  // Bildirim göster
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Bildirime tıklandı:', event);
  
  const notification = event.notification;
  notification.close();
  
  // URL'i ayarla (varsayılan olarak /dashboard'a git)
  let url = '/dashboard';
  
  if (notification.data && notification.data.url) {
    url = notification.data.url;
  } else if (notification.data && notification.data.issueId) {
    // Belirli bir arıza kaydına yönlendir
    url = `/issues/${notification.data.issueId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientsArr) => {
      // Eğer zaten açık bir pencere varsa, odaklan ve url'yi değiştir
      const hadWindowToFocus = clientsArr.some((windowClient) => {
        if (windowClient.url === url) {
          return windowClient.focus().then(() => true);
        }
        return false;
      });
      
      // Açık bir pencere yoksa, yeni bir pencere aç
      if (!hadWindowToFocus) {
        clients.openWindow(url).then((windowClient) => {
          if (windowClient) {
            windowClient.focus();
          }
        });
      }
    })
  );
});

// Service Worker kurulum aşaması
self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker kuruldu");
  self.skipWaiting();
});

// Service Worker aktifleşme aşaması
self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker aktifleştirildi");
  return self.clients.claim();
});

// Mesaj alındığında (Clientlara özel mesajlar için)
self.addEventListener("message", (event) => {
  console.log("[firebase-messaging-sw.js] Mesaj alındı:", event.data);
  
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
}); 