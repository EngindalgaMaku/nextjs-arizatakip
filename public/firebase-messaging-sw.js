// Firebase Messaging Service Worker

// Firebase versiyonları - sabit versiyonlar kullanıyoruz
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase yapılandırma değerleri
firebase.initializeApp({
  apiKey: "AIzaSyDCpkjyNxxrzTn3rXM1kuH5zn0pgIORi0g",
  authDomain: "atsis-38f7e.firebaseapp.com",
  projectId: "atsis-38f7e",
  storageBucket: "atsis-38f7e.firebasestorage.app",
  messagingSenderId: "943049988733",
  appId: "1:943049988733:web:e8c073b8760198da65ef14"
});

// Firebase Messaging nesnesini al
const messaging = firebase.messaging();

// Console'a hata ayıklama mesajı
console.log('[firebase-messaging-sw.js] Service Worker başlatıldı');

// Kullanıcı rolü için IndexedDB depolama
const dbName = 'FirebaseMessagingServiceWorkerDB';
const storeName = 'userSettings';
const userRoleKey = 'currentUserRole';

// Kullanıcı rolünü IndexedDB'ye kaydet
const saveUserRole = (role) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      store.put(role, userRoleKey);
      
      transaction.oncomplete = () => {
        console.log(`[SW] Rol kaydedildi: ${role}`);
        resolve();
      };
      
      transaction.onerror = (error) => {
        console.error('[SW] Rol kaydetme hatası:', error);
        reject(error);
      };
    };
    
    request.onerror = (error) => {
      console.error('[SW] IndexedDB açma hatası:', error);
      reject(error);
    };
  });
};

// Mevcut kullanıcı rolünü alır
const getUserRole = () => {
  // IndexedDB'den rol bilgisini alma
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(userRoleKey);
          
          getRequest.onsuccess = () => {
            const role = getRequest.result;
            console.log(`[SW] Kaydedilmiş rol: ${role || 'bulunamadı'}`);
            
            if (role) {
              resolve(role);
            } else {
              // Role bulunamadıysa client'dan iste
              requestRoleFromClient().then(resolve);
            }
          };
          
          getRequest.onerror = (error) => {
            console.error('[SW] Rol okuma hatası:', error);
            requestRoleFromClient().then(resolve);
          };
        } catch (txError) {
          console.error('[SW] Transaction hatası:', txError);
          requestRoleFromClient().then(resolve);
        }
      };
      
      request.onerror = (error) => {
        console.error('[SW] IndexedDB açma hatası:', error);
        requestRoleFromClient().then(resolve);
      };
    } catch (error) {
      console.error('[SW] IndexedDB genel hata:', error);
      requestRoleFromClient().then(resolve);
    }
  });
};

// Client'tan rol iste
const requestRoleFromClient = () => {
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    let responseReceived = false;
    
    // Mesaj kanalının cevabını dinle
    messageChannel.port1.onmessage = (event) => {
      responseReceived = true;
      const role = event.data?.role || 'unknown';
      console.log(`[SW] Client'dan rol alındı: ${role}`);
      saveUserRole(role).catch(console.error);
      resolve(role);
    };
    
    // Tüm client'lara rol talebi gönder
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        clients.forEach(client => {
          client.postMessage(
            { type: 'GET_USER_ROLE' },
            [messageChannel.port2]
          );
        });
      }
      
      // Cevap bekleme süresi (500ms)
      setTimeout(() => {
        if (!responseReceived) {
          console.log('[SW] Client cevabı alınamadı, varsayılan rol kullanılıyor');
          resolve('unknown');
        }
      }, 500);
    }).catch(() => {
      console.error('[SW] Client'lara erişim hatası');
      resolve('unknown');
    });
  });
};

// Arkaplanda bildirim alındığında
messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Arkaplanda mesaj alındı:', payload);
  
  // Bildirim başlığı ve içeriği
  const notificationTitle = payload.notification?.title || 'Yeni Bildirim';
  const notificationOptions = {
    body: payload.notification?.body || 'Yeni bir bildiriminiz var.',
    icon: '/okullogo.png',
    badge: '/icons/badge-128x128.png',
    data: {
      ...payload.data,
      timestamp: Date.now()
    },
    tag: `atsis-notification-${Date.now()}`,
  };

  // Bildirim gösterme
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Bildirime tıklandı:', event);
  
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

// Client'lardan gelen mesajları dinle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_USER_ROLE') {
    const role = event.data.role || 'unknown';
    console.log('[firebase-messaging-sw.js] Kullanıcı rolü güncellendi:', role);
    
    // Rolü IndexedDB'ye kaydet
    saveUserRole(role).catch(console.error);
    
    // Yanıt gönder
    if (event.ports && event.ports.length > 0) {
      event.ports[0].postMessage({ success: true, message: 'Rol güncellendi', role });
    }
  }
}); 