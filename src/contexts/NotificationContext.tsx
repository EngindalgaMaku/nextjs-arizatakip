'use client';

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { getDeviceTypeName } from '@/lib/helpers';

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

  useEffect(() => {
    setupRealtimeSubscription();
    
    // Ses dosyalarını önceden yükle
    if (typeof window !== 'undefined') {
      console.log('Ses dosyaları önceden yükleniyor...');
      const preloadNotificationSound = new Audio('/notification.mp3');
      const preloadNotificationAlertSound = new Audio('/notification-alert.mp3');
      
      preloadNotificationSound.preload = 'auto';
      preloadNotificationAlertSound.preload = 'auto';
      
      // Test amaçlı düşük sesle bir kez çal ve durdur (tarayıcı kısıtlamaları nedeniyle)
      const preloadSounds = async () => {
        try {
          preloadNotificationSound.volume = 0.01; // Çok düşük ses
          preloadNotificationAlertSound.volume = 0.01;
          
          // İlk sesi çal ve hemen durdur
          await preloadNotificationSound.play();
          setTimeout(() => preloadNotificationSound.pause(), 10);
          
          // İkinci sesi çal ve hemen durdur
          await preloadNotificationAlertSound.play();
          setTimeout(() => preloadNotificationAlertSound.pause(), 10);
          
          // Sesleri normal seviyeye getir
          preloadNotificationSound.volume = 1;
          preloadNotificationAlertSound.volume = 1;
          
          console.log('Ses dosyaları başarıyla yüklendi');
        } catch (e) {
          console.log('Ses dosyalarını otomatik yükleme başarısız (kullanıcı etkileşimi gerekebilir):', e);
        }
      };
      
      // Kullanıcı etkileşimi kontrolü - tarayıcı kısıtlamaları nedeniyle
      if (document.hasFocus()) {
        preloadSounds();
      } else {
        // Sayfa odağı kazandığında yükle
        const handleFocus = () => {
          preloadSounds();
          window.removeEventListener('focus', handleFocus);
        };
        
        window.addEventListener('focus', handleFocus);
      }
    }

    return () => {
      // Aboneliği temizle
      if (supabaseSubscription.current) {
        supabaseSubscription.current.unsubscribe();
      }
    };
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
      const { supabase } = await import('@/lib/supabase');
      
      console.log('Realtime notification subscription kurulumu başlatılıyor...');
      
      // issues tablosundaki yeni kayıtları dinle
      supabaseSubscription.current = supabase
        .channel('issues-channel')
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
          
          // Sesli bildirim
          playNotificationSound();
        })
        .subscribe((status) => {
          console.log('Realtime notification subscription durumu:', status);
        });
      
    } catch (error) {
      console.error('Gerçek zamanlı bildirim aboneliği kurulurken hata:', error);
    }
  };

  // Bildirim sesi çal
  const playNotificationSound = async () => {
    try {
      console.log('Bildirim sesleri çalınıyor...');
      
      // Ses dosyalarını önceden yükle
      const notificationAudio = new Audio('/notification.mp3');
      const alertAudio = new Audio('/notification-alert.mp3');
      
      // Promise temelli çalma işlemi
      const playSequentially = async () => {
        try {
          // İlk sesi çal ve tamamlanmasını bekle
          console.log('Bildirim sesi başlatılıyor: notification.mp3');
          await notificationAudio.play();
          
          // İlk ses bittiğinde çalışacak
          return new Promise<void>((resolve) => {
            notificationAudio.onended = async () => {
              console.log('Bildirim sesi tamamlandı, uyarı sesi başlatılıyor: notification-alert.mp3');
              
              try {
                // İkinci sesi çal
                await alertAudio.play();
                alertAudio.onended = () => {
                  console.log('Uyarı sesi tamamlandı');
                  resolve();
                };
              } catch (e) {
                console.error('Uyarı sesi çalma hatası:', e);
                resolve(); // Hata durumunda bile promise'i çöz
              }
            };
          });
        } catch (e) {
          console.error('Bildirim sesi çalma hatası:', e);
        }
      };
      
      // Ses çalma işlemini başlat
      playSequentially();
      
    } catch (error) {
      console.error('Bildirim sesi çalınamadı:', error);
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