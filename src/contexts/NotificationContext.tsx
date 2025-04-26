'use client';

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { getDeviceTypeName } from '@/lib/helpers';
import { playAlertSound } from '@/lib/notification';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: boolean;
  closeNotification: () => void;
  handleNotificationClick: (id: string) => void;
  updateDashboardCounts?: (increment: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const supabaseSubscription = useRef<any>(null);
  const router = useRouter();
  const updateDashboardCountsRef = useRef<((increment: boolean) => void) | null>(null);
  // URL değişikliğini takip etmek için pathname referansı
  const currentPathRef = useRef<string>('');
  // FCM token
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  
  useEffect(() => {
    // İlk yükleme ve temizlik
    setupRealtimeSubscription();

    // URL değişimini kontrol eden alt bileşen
    const checkRouteChange = () => {
      // Next.js client tarafında window nesnesine erişim kontrolü
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        
        // Yol değiştiyse ve önceki bir yol kaydedilmişse
        if (currentPathRef.current && pathname !== currentPathRef.current) {
          console.log('URL değişikliği algılandı, bildirim aboneliği yenileniyor...');
          
          // Önce mevcut aboneliği temizle
          if (supabaseSubscription.current) {
            supabaseSubscription.current.unsubscribe();
            supabaseSubscription.current = null;
          }
          
          // Aboneliği yeniden oluştur
          setupRealtimeSubscription();
        }
        
        // Mevcut yolu güncelle
        currentPathRef.current = pathname;
      }
    };
    
    // Router olaylarını dinle
    window.addEventListener('popstate', checkRouteChange);
    
    // Periyodik kontrol (SPA geçişlerini yakalamak için)
    const interval = setInterval(checkRouteChange, 1000);

    return () => {
      // Aboneliği temizle
      if (supabaseSubscription.current) {
        supabaseSubscription.current.unsubscribe();
      }
      // Olay dinleyicilerini temizle
      window.removeEventListener('popstate', checkRouteChange);
      clearInterval(interval);
    };
  }, []);

  // FCM izni isteme ve token alma
  useEffect(() => {
    const setupFCM = async () => {
      try {
        // Firebase ve FCM modüllerini dinamik olarak import et
        const { requestFCMPermission, listenForFCMMessages } = await import('@/lib/firebase');
        const { getCurrentUser, saveFCMToken } = await import('@/lib/supabase');
        
        // Kullanıcı ID'sini al
        const user = await getCurrentUser();
        
        if (user) {
          // FCM izinlerini iste
          const token = await requestFCMPermission();
          if (token) {
            setFcmToken(token);
            console.log('FCM token başarıyla alındı ve kaydedildi');
            
            // Token'ı veritabanına kaydet
            await saveFCMToken(user.id, token);
            
            // FCM mesajlarını dinle
            listenForFCMMessages((payload) => {
              console.log('FCM bildirimi alındı:', payload);
              
              // Bildirimi göster (hem mesajlaşma için hem de görsel bildirim için)
              const notification = {
                id: payload.data?.issueId || `fcm-${Date.now()}`,
                message: payload.notification?.body || 'Yeni bir bildirim',
                isRead: false
              };
              
              // Bildirimleri güncelle
              setNotifications(prev => [notification, ...prev]);
              setShowNotification(true);
              
              // Sesli bildirim
              playAlertSound();
            });
          }
        } else {
          console.log('FCM token kaydı için kullanıcı bulunamadı');
        }
      } catch (error) {
        console.error('FCM kurulumu sırasında hata:', error);
      }
    };
    
    // Client tarafında olduğunu kontrol et
    if (typeof window !== 'undefined') {
      setupFCM();
    }
  }, []);

  // Dashboard sayılarını güncellemek için method
  const updateDashboardCounts = (increment: boolean) => {
    if (increment && updateDashboardCountsRef.current) {
      updateDashboardCountsRef.current(increment);
    } else if (!increment && typeof increment === 'function') {
      // Bu durumda increment aslında handler fonksiyonu
      updateDashboardCountsRef.current = increment as unknown as (increment: boolean) => void;
    }
  };

  // Dashboard komponenti bu methodu çağırarak sayı güncelleme fonksiyonunu kaydeder
  const registerDashboardCountsUpdater = (updater: (increment: boolean) => void) => {
    updateDashboardCountsRef.current = updater;
  };

  // Gerçek zamanlı abonelik kurulumu
  const setupRealtimeSubscription = async () => {
    try {
      // Eğer zaten aktif bir abonelik varsa, önce onu temizleyelim
      if (supabaseSubscription.current) {
        console.log('Mevcut abonelik temizleniyor...');
        await supabaseSubscription.current.unsubscribe();
        supabaseSubscription.current = null;
      }

      // Client tarafı kontrolü
      if (typeof window === 'undefined') {
        console.log('Server-side rendering sırasında abonelik kurulmuyor');
        return;
      }
      
      const { supabase } = await import('@/lib/supabase');
      
      console.log('Realtime notification subscription kurulumu başlatılıyor...');
      
      // Benzersiz bir kanal ID'si oluştur (URL ve zaman damgası içeren)
      const channelId = `issues-channel-${window.location.pathname}-${Date.now()}`;
      console.log(`Yeni kanal ID'si: ${channelId}`);
      
      // issues tablosundaki yeni kayıtları dinle
      supabaseSubscription.current = supabase
        .channel(channelId)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'issues' 
        }, (payload) => {
          console.log('Yeni arıza bildirimi alındı:', payload);
          
          // Yeni bir arıza oluşturulduğunda
          const newIssue = payload.new;
          
          // Bildirim oluştur
          const notification = {
            id: newIssue.id,
            message: `Yeni arıza bildirimi: ${newIssue.device_name} (${getDeviceTypeName(newIssue.device_type)}) - ${newIssue.reported_by} tarafından`,
            isRead: false
          };
          
          // Bildirimleri güncelle
          setNotifications(prev => [notification, ...prev]);
          
          // Bildirim göster
          setShowNotification(true);
          
          // Dashboard sayılarını güncelle
          if (updateDashboardCountsRef.current) {
            updateDashboardCountsRef.current(true);
          }
          
          // Sesli bildirim (sadece yeni arıza oluşturulduğunda)
          playAlertSound();
          
          // DOM üzerinden doğrudan ses çal (ek güvenlik önlemi)
          try {
            // Varsa eski ses elementini temizle
            const existingSound = document.getElementById('notification-sound');
            if (existingSound) {
              document.body.removeChild(existingSound);
            }
            
            // Birinci ses (notification-alert.mp3) için element oluştur
            const firstAudioElement = document.createElement('audio');
            firstAudioElement.id = 'notification-sound-1';
            firstAudioElement.src = '/notification-alert.mp3';
            firstAudioElement.volume = 1.0;
            
            // İkinci ses (notification.mp3) için element oluştur
            const secondAudioElement = document.createElement('audio');
            secondAudioElement.id = 'notification-sound-2';
            secondAudioElement.src = '/notification.mp3';
            secondAudioElement.volume = 1.0;
            
            // İlk ses bittiğinde ikinci sesi çal
            firstAudioElement.onended = () => {
              console.log('İlk ses bitti, ikinci ses çalınıyor...');
              secondAudioElement.play()
                .then(() => console.log('İkinci ses başarıyla çalındı'))
                .catch(err => console.error('İkinci ses çalma hatası:', err));
            };
            
            // İkinci ses bittiğinde elementleri temizle
            secondAudioElement.onended = () => {
              if (document.body.contains(firstAudioElement)) {
                document.body.removeChild(firstAudioElement);
              }
              if (document.body.contains(secondAudioElement)) {
                document.body.removeChild(secondAudioElement);
              }
              console.log('Bildirim sesi sekansı tamamlandı, elementler temizlendi');
            };
            
            // İlk elementi DOM'a ekleyip ilk sesi çal
            document.body.appendChild(firstAudioElement);
            document.body.appendChild(secondAudioElement);
            
            // İlk sesi çal
            const playPromise = firstAudioElement.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => console.log('İlk ses başarıyla çalıyor'))
                .catch(error => {
                  console.error('İlk ses çalma hatası:', error);
                  // İlk ses çalınamazsa ikinci sesi denemeyi dene
                  secondAudioElement.play()
                    .then(() => console.log('İlk ses atlandı, ikinci ses çalıyor'))
                    .catch(err => console.error('İkinci ses de çalınamadı:', err));
                });
            }
          } catch (audioError) {
            console.error('Doğrudan DOM ses çalma hatası:', audioError);
          }
        })
        .subscribe((status) => {
          console.log('Realtime notification subscription durumu:', status);
        });
      
    } catch (error) {
      console.error('Gerçek zamanlı bildirim aboneliği kurulurken hata:', error);
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
    
    // İlgili arıza detayına yönlendir
    router.push(`/dashboard/issues?id=${id}`);
    setShowNotification(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        closeNotification,
        handleNotificationClick,
        updateDashboardCounts
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