'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getMessaging, onMessage, getToken } from 'firebase/messaging';
import { requestFCMPermission, clearFCMToken, setupMessageListener } from '@/lib/firebase';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { getDeviceTypeName } from '@/lib/helpers';
import { playAlertSound, showBrowserNotification, initializeAudio } from '@/lib/notification';
import { 
  supabase, 
  saveFCMToken, 
  deleteFCMToken
} from "@/lib/supabase";
import { firebaseApp } from "@/lib/firebase";
import { User } from '@supabase/auth-js';

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
  const hasUserInteractedRef = useRef(false);

  // Kullanıcı etkileşimini takip et
  useEffect(() => {
    const trackUserInteraction = () => {
      console.log("Kullanıcı sayfayla etkileşime girdi");
      if (!hasUserInteractedRef.current) {
          hasUserInteractedRef.current = true;
          // Initialize audio *after* first interaction
          initializeAudio().then(() => {
              console.log('Audio system initialized after user interaction.');
          });
      }
    };
    
    // Çeşitli kullanıcı etkileşimi olaylarını dinle
    window.addEventListener('click', trackUserInteraction);
    window.addEventListener('touchstart', trackUserInteraction);
    window.addEventListener('keydown', trackUserInteraction);
    window.addEventListener('mousedown', trackUserInteraction);
    
    return () => {
      window.removeEventListener('click', trackUserInteraction);
      window.removeEventListener('touchstart', trackUserInteraction);
      window.removeEventListener('keydown', trackUserInteraction);
      window.removeEventListener('mousedown', trackUserInteraction);
    };
  }, []);

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
      
      // FCM izni ve token alma
      const fcmToken = await requestFCMPermission(userId, userRole);
      
      if (!fcmToken) {
        console.warn('FCM token alınamadı, bildirimler çalışmayabilir');
        return false;
      }
      
      // Token zaten kaydedildi, durumu güncelle
      fcmInitialized.current = true;
      
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
            onClick={() => toast.dismiss(t.id)}
            className={`$
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 pt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.017 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold">Yeni Bildirim</p>
                  <p className="mt-1 text-sm">{payload.new.mesaj}</p>
                </div>
              </div>
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

  // Real-time FCM mesajlarını dinleme - Sadece user değiştiğinde kurulur
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (user) {
      console.log(`Kullanıcı girişi algılandı, FCM dinleyicisi kuruluyor...`);
      // setupFirebaseListeners'ı çağır ve unsubscribe fonksiyonunu al
      const setup = async () => {
         unsubscribe = await setupFirebaseListeners();
      };
      setup();
    } else {
      console.log(`Kullanıcı çıkışı algılandı, FCM dinleyicisi temizleniyor...`);
    }

    // Cleanup function: sadece component unmount olduğunda veya user değiştiğinde çalışır
    return () => {
      if (unsubscribe) {
        console.log('FCM dinleyicisi useEffect cleanup içinde temizleniyor...');
        unsubscribe();
      }
    };
  }, [user]); // Sadece user'a bağımlı

  const setupFirebaseListeners = async (): Promise<(() => void) | null> => {
    if (!user) return null;

    try {
      // Messaging'i başlat ve token al (Bu zaten izin kontrolü yapıyor)
      const token = await requestFCMPermission(user.id, user.role || 'anonymous');
      if (token) {
        console.log("FCM token alındı (setupFirebaseListeners içinde):", token);
        setFcmToken(token);
      } else {
        console.warn("FCM token alınamadı, mesaj dinleyicisi kurulamıyor.");
        return null; // Token yoksa dinleyici kurma
      }

      const app = firebaseApp();
      if (!app) {
         console.error("Firebase App başlatılamadı.");
         return null;
      }
      
      const messaging = getMessaging(app);
      if (!messaging) {
          console.error("Firebase Messaging başlatılamadı.");
          return null;
      }
      
      console.log("Firebase onMessage dinleyicisi kuruluyor...");
      const onMessageUnsubscribe = onMessage(messaging, (payload) => {
        // Mevcut pathname'i burada alabiliriz, ama gerek yok gibi çünkü her sayfada aynı işlem yapılacak
        const currentPath = window.location.pathname; 
        console.log("Foreground mesajı alındı:", payload, "sayfa:", currentPath);

        if (payload.notification?.title) {
          const notificationData: Notification = {
            id: 'fcm-' + Date.now().toString(),
            message: payload.notification.body || "",
            isRead: false,
            fcmData: {
              title: payload.notification.title,
              url: payload.data?.url || "",
              userRole: payload.data?.userRole || user.role // Gelen payload'dan userRole almayı dene
            }
          };

          setNotifications((prev) => [notificationData, ...prev]);

          console.log("Bildirim sesi çalınıyor mu kontrol ediliyor...");
          if (hasUserInteractedRef.current) {
            console.log("Kullanıcı etkileşimde bulundu, bildirim sesi çalınıyor...");
            playAlertSound();
          } else {
            console.log("Kullanıcı henüz etkileşimde bulunmadığı için ses çalınmadı.");
          }

          if (payload.notification?.title) {
            showBrowserNotification({
              title: payload.notification.title,
              body: payload.notification.body || '',
              url: payload.data?.url || '/',
              onClick: () => { // Browser bildirimine tıklanınca ilgili sayfaya git
                 if (payload.data?.url) {
                    router.push(payload.data.url);
                 }
              }
            });
          }

          setNotificationCount((prev) => prev + 1);
          setLastNotification(notificationData);
          
          // Toast gösterimleri (Bu kısım aynı kalabilir)
          if (payload.data?.userRole === 'teacher' || payload.data?.showToast === 'true') {
            // Show a special toast notification for teachers
            toast.custom((t) => (
              <div
                onClick={() => { // Toast'a tıklanınca ilgili sayfaya git ve kapat
                   toast.dismiss(t.id); 
                   if (payload.data?.url) router.push(payload.data.url);
                }}
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 pt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-semibold">{payload.notification?.title || 'Öğretmen Bildirimi'}</p>
                      <p className="mt-1 text-sm">{payload.notification?.body || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            ));
          } else {
            // Default toast notification for non-teacher users (e.g., admin)
            toast.custom((t) => (
              <div
                onClick={() => { // Toast'a tıklanınca ilgili sayfaya git ve kapat
                   toast.dismiss(t.id); 
                   if (payload.data?.url) router.push(payload.data.url);
                }}
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 pt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.017 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-semibold">{payload.notification?.title || 'Yeni Bildirim'}</p>
                      <p className="mt-1 text-sm">{payload.notification?.body || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            ));
          }
        }
      });

      console.log('FCM onMessage dinleyicisi başarıyla kuruldu.');
      return onMessageUnsubscribe; // Cleanup için unsubscribe fonksiyonunu döndür

    } catch (error) {
      console.error('FCM dinleyicisi kurulurken hata oluştu:', error);
      return null;
    }
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