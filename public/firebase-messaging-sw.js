// Firebase Messaging Service Worker

// Firebase versiyonları - güncellemeden sonra bunları doğru versiyon numaralarına güncellemeniz gerekebilir
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

/* 
 * ÖNEMLİ: Bu dosyadaki Firebase yapılandırma değerlerini Firebase Console'dan aldığınız gerçek değerlerle değiştirmeniz gerekiyor.
 * Bu değerleri doğrudan Firebase Console -> Proje Ayarları -> Genel -> "Web uygulamanız için Firebase SDK snippet'i yapılandırın" kısmından alabilirsiniz.
 * 
 * NOT: Bu bir service worker dosyası olduğu için, environment değişkenleri burada çalışmaz. Değerleri doğrudan bu dosyaya yazmanız gerekiyor.
 */
firebase.initializeApp({
  apiKey: "FIREBASE_API_KEY_BURAYA",
  authDomain: "FIREBASE_AUTH_DOMAIN_BURAYA",
  projectId: "FIREBASE_PROJECT_ID_BURAYA",
  storageBucket: "FIREBASE_STORAGE_BUCKET_BURAYA",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID_BURAYA",
  appId: "FIREBASE_APP_ID_BURAYA"
});

// Firebase Messaging nesnesini al
const messaging = firebase.messaging();

// Mevcut kullanıcı rolünü alır
const getUserRole = () => {
  // IndexedDB'den veya localStorage'dan rol bilgisini alma girişimi
  return new Promise((resolve) => {
    // Bilinen rol anahtarları
    const knownRoleKeys = ['fcm_user_role', 'userRole', 'role'];
    
    // IndexedDB yoklama (asenkron)
    let roleFound = false;
    
    // Service worker'da localStorage doğrudan erişilemez, clients API kullanmamız gerekiyor
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        // İlk client'a mesaj gönder, rol bilgisi iste
        const client = clients[0];
        client.postMessage({ type: 'GET_USER_ROLE' });
        
        // Cevabı beklemek yerine, varsayılan olarak genel rol (zamanı korumak için)
        setTimeout(() => {
          if (!roleFound) resolve('any');
        }, 100);
        
        // Mesaj dinleyicisi
        self.addEventListener('message', event => {
          if (event.data && event.data.type === 'USER_ROLE_RESPONSE') {
            roleFound = true;
            resolve(event.data.role || 'any');
          }
        });
      } else {
        // Client yoksa, varsayılan rol
        resolve('any');
      }
    }).catch(() => resolve('any'));
  });
};

// Arkaplanda bildirim alındığında
messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Arkaplanda mesaj alındı ', payload);
  
  // Rol kontrolü
  const userRole = await getUserRole();
  const messageRole = payload.data?.userRole || 'any';
  
  // Bildirim bu kullanıcının rolü için değilse gösterme
  if (userRole !== 'any' && messageRole !== 'any' && userRole !== messageRole) {
    console.log(`[firebase-messaging-sw.js] Bildirim rolü (${messageRole}) kullanıcı rolüyle (${userRole}) uyuşmuyor. Bildirim gösterilmeyecek.`);
    return;
  }
  
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
  const userRole = event.notification.data?.userRole || 'any';
  
  // Rolüne göre yönlendirme kontrolü
  let targetUrl;
  if (userRole === 'admin') {
    targetUrl = urlToOpen.startsWith('/') ? urlToOpen : '/dashboard';
  } else if (userRole === 'teacher') {
    targetUrl = urlToOpen.startsWith('/teacher') ? urlToOpen : '/teacher/issues';
  } else {
    targetUrl = urlToOpen; // varsayılan
  }
  
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
            client.navigate(targetUrl);
            return;
          }
        }
        
        // Açık bir pencere yoksa yeni bir tane aç
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
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

// Client'lardan gelen mesajları dinle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_USER_ROLE') {
    console.log('[firebase-messaging-sw.js] Kullanıcı rolü güncellendi:', event.data.role);
  }
}); 