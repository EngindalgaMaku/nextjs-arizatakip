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

  useEffect(() => {
    setupRealtimeSubscription();

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
          
          // Sesli bildirim (sadece yeni arıza oluşturulduğunda)
          playAlertSound();
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