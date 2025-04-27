'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getMessaging, onMessage, getToken } from 'firebase/messaging';
import { requestFCMPermission, clearFCMToken, setupMessageListener } from '@/lib/firebase';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { getDeviceTypeName } from '@/lib/helpers';
import { playAlertSound } from '@/lib/notification';
import { 
  supabase, 
  saveFCMToken, 
  deleteFCMToken
} from "@/lib/supabase";
import { firebaseApp } from "@/lib/firebase";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  fcmData?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: boolean;
  closeNotification: () => void;
  handleNotificationClick: (id: string) => void;
  updateDashboardCounts: (increment: boolean) => void;
  notificationCount: number;
  lastNotification: any | null;
  setupFCM: (userId: string, userRole: string) => Promise<boolean>;
  cleanupFCM: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const supabaseSubscription = useRef<any>(null);
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);
  const router = useRouter();
  const updateDashboardCountsRef = useRef<((increment: boolean) => void) | null>(null);
  const isInitialized = useRef(false);
  const fcmInitialized = useRef(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<any | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const messageUnsubscribeRef = useRef<(() => void) | null>(null);

  // Sayfadan ayrılırken uyarı göster
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (user) {
        e.preventDefault();
        e.returnValue = 'Sayfadan ayrılırsanız bildirimlerinizi alamazsınız!';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // FCM kurulumu
  const setupFCM = async (userId: string, userRole: string): Promise<boolean> => {
    if (!userId || fcmInitialized.current) return false;
    
    try {
      console.log('FCM kurulumu başlatılıyor...');
      
      // FCM token almadan önce bildirim görünürlüğünü test et
      toast.success('Bildirim testi - Eğer bu mesajı görüyorsanız, bildirimler çalışıyor');
      
      // FCM izni ve token alma
      const fcmToken = await requestFCMPermission(userId, userRole);
      
      if (!fcmToken) {
        console.warn('FCM token alınamadı, bildirimler çalışmayabilir');
        return false;
      }
      
      // Token zaten kaydedildi, durumu güncelle
      fcmInitialized.current = true;
      
      // NOT: Artık onMessage dinleyicisini burada kurmaya gerek yok
      // çünkü useEffect içinde zaten kuruyoruz
      
      console.log('FCM başarıyla kuruldu');
      return true;
    } catch (error) {
      console.error('FCM kurulum hatası:', error);
      return false;
    }
  };
  
  // FCM temizleme
  const cleanupFCM = async (): Promise<boolean> => {
    try {
      if (!fcmInitialized.current) return true;
      
      // FCM token'ı Supabase'den sil
      const userId = localStorage.getItem('fcm_user_id');
      if (userId) {
        const deleteResult = await deleteFCMToken(userId);
        if (!deleteResult) {
          console.warn('Token Supabase\'den silinemedi');
        }
      }
      
      // FCM token'ı temizle
      await clearFCMToken();
      
      fcmInitialized.current = false;
      console.log('FCM başarıyla temizlendi');
      return true;
    } catch (error) {
      console.error('FCM temizleme hatası:', error);
      return false;
    }
  };

  // Realtime aboneliği kur/kaldır
  const setupRealtimeSubscription = useCallback(() => {
    if (!user || !isInitialized.current) return;

    // Önceki aboneliği temizle
    if (supabaseSubscription.current) {
      supabaseSubscription.current.unsubscribe();
      supabaseSubscription.current = null;
    }

    console.log('Realtime bildirim aboneliği kuruluyor...');

    // Yeni abonelik oluştur
    supabaseSubscription.current = supabase
      .channel('bildirimler')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bildirimler',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        console.log('Yeni bildirim alındı:', payload);
        
        // Bildirim göster
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">Yeni Bildirim</p>
                  <p className="mt-1 text-sm text-gray-500">{payload.new.mesaj}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Kapat
              </button>
            </div>
          </div>
        ));
        
        // Bildirim sayısını ve son bildirimi güncelle
        setNotificationCount((prev) => prev + 1);
        setLastNotification(payload.new);
      })
      .subscribe((status) => {
        console.log('Realtime abonelik durumu:', status);
      });

    console.log('Realtime abonelik kuruldu');
  }, [user, supabase]);

  // URL değişikliklerini takip et
  useEffect(() => {
    // Son path ile mevcut path karşılaştır
    if (lastPathRef.current !== null && lastPathRef.current !== pathname) {
      console.log('URL değişikliği algılandı:', lastPathRef.current, '->', pathname);
      
      // Aboneliği yenile
      setupRealtimeSubscription();
    }
    
    // Mevcut path'i kaydet
    lastPathRef.current = pathname;
  }, [pathname, setupRealtimeSubscription]);

  // Kullanıcı ve URL değişikliklerinde aboneliği güncelle
  useEffect(() => {
    // Kullanıcı yoksa aboneliği temizle
    if (!user) {
      if (supabaseSubscription.current) {
        console.log('Kullanıcı çıkış yaptı, abonelik temizleniyor...');
        supabaseSubscription.current.unsubscribe();
        supabaseSubscription.current = null;
      }
      
      // FCM temizle
      cleanupFCM().then(() => {
        console.log('FCM bilgileri temizlendi');
      });
      
      return;
    }
    
    // İlk kez ya da URL değişikliğinde aboneliği kur
    if (!isInitialized.current || lastPathRef.current !== pathname) {
      setupRealtimeSubscription();
      isInitialized.current = true;
      
      // FCM kur (eğer hazır değilse)
      if (!fcmInitialized.current) {
        setupFCM(user.id, user.role || 'anonymous').then((success) => {
          if (success) {
            console.log('FCM kurulumu tamamlandı');
          } else {
            console.warn('FCM kurulumu başarısız oldu');
          }
        });
      }
    }
    
    return () => {
      // Component unmount olduğunda aboneliği temizle
      if (supabaseSubscription.current) {
        supabaseSubscription.current.unsubscribe();
        supabaseSubscription.current = null;
      }
    };
  }, [user, pathname, setupRealtimeSubscription]);

  // Dashboard sayılarını güncellemek için method
  const updateDashboardCounts = (increment: boolean) => {
    if (increment && updateDashboardCountsRef.current) {
      updateDashboardCountsRef.current(increment);
    } else if (!increment && typeof increment === 'function') {
      // Bu durumda increment aslında handler fonksiyonu
      updateDashboardCountsRef.current = increment as unknown as (increment: boolean) => void;
    }
  };

  // Bildirimi kapat
  const closeNotification = () => {
    setShowNotification(false);
  };

  // Bildirime tıklama
  const handleNotificationClick = (id: string) => {
    // Bildirimi okundu olarak işaretle
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
    
    // Bulabildiğimiz bildirimi al
    const notification = notifications.find(n => n.id === id);
    
    // FCM-spesifik veri var mı kontrol et
    const isFcmNotification = id.startsWith('fcm-');
    
    if (isFcmNotification && notification && notification.fcmData) {
      // FCM verisi varsa, kullanıcı rolüne göre yönlendir
      const { url, userRole } = notification.fcmData;
      
      // Güncel kullanıcının rolünü kontrol et
      const checkUserPermission = async () => {
        try {
          const { loadUserData } = await import('@/lib/supabase');
          const userData = await loadUserData();
          
          if (userData && userData.role === 'admin') {
            // Admin her iki URL'ye de gidebilir
            router.push(url);
          } else if (userRole === 'teacher' && url.startsWith('/teacher')) {
            // Öğretmen sadece öğretmen URL'lerine gidebilir
            router.push(url);
          } else {
            // Yetkisiz erişim
            console.error('Bu bildirimi görüntülemek için yetkiniz yok');
            // Kullanıcıya uygun sayfaya yönlendir
            router.push(userData && userData.role === 'admin' ? '/dashboard' : '/teacher');
          }
        } catch (error) {
          console.error('Kullanıcı yetki kontrolünde hata:', error);
          // Hata durumunda ana sayfaya yönlendir
          router.push('/');
        }
      };
      
      checkUserPermission();
    } else {
      // Normal bildirimlerde veya FCM verisi yoksa, varsayılan yönlendirme
      const targetUrl = `/dashboard/issues?id=${id}`;
      router.push(targetUrl);
    }
    
    setShowNotification(false);
  };

  // Firebase token alma işlemi ve mesaj dinleyicisi kurulumu
  const setupFirebaseListeners = useCallback(() => {
    if (!user || !user.id) return;
  
    console.log("Firebase dinleyicileri kuruluyor - sayfa:", pathname);
    
    // Önceki dinleyiciyi temizle
    if (messageUnsubscribeRef.current) {
      console.log("Önceki Firebase mesaj dinleyicisi temizleniyor");
      messageUnsubscribeRef.current();
      messageUnsubscribeRef.current = null;
    }

    // Messaging'i başlat ve token al
    requestFCMPermission(user.id, user.role || 'anonymous')
      .then((token) => {
        if (token) {
          console.log("FCM token alındı:", token);
          setFcmToken(token);
        }
      })
      .catch((error) => {
        console.error("FCM token alınamadı:", error);
      });

    // Mesaj dinleyicisi
    try {
      const app = firebaseApp();
      if (app) {
        const messaging = getMessaging(app);
        if (messaging) {
          console.log("Firebase mesaj dinleyicisi kuruluyor - sayfa:", pathname);
          
          // onMessage dinleyicisi kur ve referansını sakla
          messageUnsubscribeRef.current = onMessage(messaging, (payload) => {
            console.log("Foreground mesajı alındı:", payload, "sayfa:", pathname);
            if (payload.notification?.title) {
              const notificationData: Notification = {
                id: 'fcm-' + Date.now().toString(),
                message: payload.notification.body || "",
                isRead: false,
                fcmData: {
                  title: payload.notification.title,
                  url: payload.data?.url || "",
                  userRole: user.role
                }
              };
              
              // Mesajı bildirim listesine ekle
              setNotifications((prev) => [notificationData, ...prev]);
              
              // Bildirim sesini çal
              console.log("Bildirim sesi çalınıyor - sayfa:", pathname);
              playAlertSound();
              
              // Tarayıcıya bildirim göster (browser notification API)
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(payload.notification.title, {
                    body: payload.notification.body,
                    icon: '/okullogo.png'
                  });
                } catch (e) {
                  console.error("Browser notification failed:", e);
                }
              }
              
              // Okunmamış bildirimleri güncelle
              setNotificationCount((prev) => prev + 1);
              setLastNotification(notificationData);
              
              // Toast bildirimi göster
              toast.custom((t) => (
                <div
                  className={`${
                    t.visible ? 'animate-enter' : 'animate-leave'
                  } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
                >
                  <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{payload.notification?.title || 'Yeni Bildirim'}</p>
                        <p className="mt-1 text-sm text-gray-500">{payload.notification?.body || ''}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex border-l border-gray-200">
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              ));
            }
          });
          
          console.log("Firebase mesaj dinleyicisi kuruldu - sayfa:", pathname);
        }
      }
    } catch (error) {
      console.error("Firebase mesaj dinleyicisi kurulurken hata:", error);
    }
  }, [user, pathname]);

  // Kullanıcı, URL değişiminde ve bileşen monte edildiğinde Firebase dinleyicilerini kur
  useEffect(() => {
    // Sayfa değişikliklerinde konsola bilgi yazdır
    console.log("NotificationContext: Sayfa değişimi algılandı", {
      sayfa: pathname,
      kullaniciVarMi: !!user,
      dinleyiciVarMi: !!messageUnsubscribeRef.current
    });

    // Eğer kullanıcı varsa ve dinleyici yoksa veya sayfa değiştiyse dinleyicileri kur
    if (user && (!messageUnsubscribeRef.current || lastPathRef.current !== pathname)) {
      console.log("NotificationContext: Firebase dinleyicileri yeniden kuruluyor");
      setupFirebaseListeners();
    }
    
    return () => {
      // Component unmount olduğunda dinleyiciyi temizle
      if (messageUnsubscribeRef.current) {
        messageUnsubscribeRef.current();
        messageUnsubscribeRef.current = null;
      }
    };
  }, [user, pathname, setupFirebaseListeners]);

  // Supabase realtime aboneliği
  useEffect(() => {
    // URL değişikliğinde yeniden abonelik
    if (pathname && supabaseSubscription.current && supabase) {
      console.log("URL değişti, Supabase aboneliği yenileniyor:", pathname);
      supabaseSubscription.current.unsubscribe();
      setupRealtimeSubscription();
    }
  }, [user, pathname, setupRealtimeSubscription]);

  // Manuel olarak bildirimleri test etme fonksiyonu
  const testNotifications = () => {
    console.log("Manuel bildirim testi başlatılıyor...");
    
    // Bildirim sesini çal
    playAlertSound();
    
    // Fake bir FCM mesajı oluştur ve işle
    const fakePayload = {
      notification: {
        title: "Test Bildirimi",
        body: "Bu bir test bildirimidir. Bildirim sistemi çalışıyor!"
      },
      data: {
        url: "/dashboard"
      }
    };
    
    const notificationData: Notification = {
      id: 'test-' + Date.now().toString(),
      message: fakePayload.notification.body,
      isRead: false,
      fcmData: {
        title: fakePayload.notification.title,
        url: fakePayload.data.url,
        userRole: user?.role
      }
    };
    
    // Bildirim listesine ekle
    setNotifications((prev) => [notificationData, ...prev]);
    
    // Bildirim sayacını artır
    setNotificationCount((prev) => prev + 1);
    
    // Toast bildirim göster
    toast.success("Bildirim testi başarılı!");
    
    // Firebase dinleyicilerini yeniden kur
    setupFirebaseListeners();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        closeNotification,
        handleNotificationClick,
        updateDashboardCounts,
        notificationCount,
        lastNotification,
        setupFCM,
        cleanupFCM
      }}
    >
      {children}
      
      {/* Bildirim alanı */}
      {showNotification && notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <BellIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-gray-900">Yeni arıza bildirimi</p>
                <p className="mt-1 text-sm text-gray-500">{notifications[0].message}</p>
                <div className="mt-3 flex space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => handleNotificationClick(notifications[0].id)}
                  >
                    Görüntüle
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={closeNotification}
                  >
                    Kapat
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={closeNotification}
                >
                  <span className="sr-only">Kapat</span>
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gizli Bildirim Test düğmesi - Double click ile aktifleşir */}
      <div
        className="fixed bottom-0 right-0 w-6 h-6 opacity-0"
        onDoubleClick={testNotifications}
        title="Bildirimleri test etmek için çift tıkla"
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications hook must be used within a NotificationProvider');
  }
  return context;
} 