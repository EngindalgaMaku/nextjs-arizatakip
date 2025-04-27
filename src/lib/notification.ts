'use client';

import { Issue } from './supabase';
import { toast } from 'react-hot-toast';

// Sesli bildirim için sabit
const NOTIFICATION_ALERT_SOUND = '/notification-alert.mp3';

interface NotificationOptions {
  title: string;
  body: string;
  url?: string;
  onClick?: () => void;
}

/**
 * Play notification sound
 * @param {boolean} showVisualFallback - If true, shows a visual fallback notification when sound can't play
 */
export function playAlertSound(showVisualFallback = true) {
  try {
    console.log("Bildirim sesi çalmaya başlıyor...");
    
    // Kullanıcının etkileşim durumunu kontrol et
    const hasInteracted = document.querySelectorAll('*:active').length > 0 || 
                         document.hasFocus() || 
                         document.visibilityState === 'visible';
    
    console.log("Kullanıcı etkileşim durumu:", hasInteracted);
    
    // First play the alert sound
    const alertAudio = new Audio(NOTIFICATION_ALERT_SOUND);
    alertAudio.volume = 0.5;
    alertAudio.muted = true; // Önce sessiz başlat
    
    // Debug için daha fazla çıktı
    alertAudio.addEventListener('canplay', () => {
      console.log("Alert ses dosyası yüklendi ve çalınmaya hazır");
      // Yüklendiğinde ses açma
      try {
        alertAudio.muted = false;
      } catch (e) {
        console.log("Ses açma hatası:", e);
      }
    });
    
    alertAudio.addEventListener('playing', () => {
      console.log("Alert ses dosyası çalıyor");
    });
    
    alertAudio.addEventListener('error', (e) => {
      console.error("Alert ses dosyası çalma hatası:", e);
    });
    
    // Then play the main notification sound after the alert finishes
    alertAudio.onended = () => {
      console.log("Alert ses dosyası bitti, ana bildirim sesi başlıyor");
      const notificationAudio = new Audio('/notification.mp3');
      notificationAudio.volume = 0.5;
      notificationAudio.muted = true; // Önce sessiz başlat
      
      notificationAudio.addEventListener('canplay', () => {
        console.log("Ana bildirim ses dosyası yüklendi ve çalınmaya hazır");
        // Yüklendiğinde ses açma
        try {
          notificationAudio.muted = false;
        } catch (e) {
          console.log("Ses açma hatası:", e);
        }
      });
      
      notificationAudio.addEventListener('playing', () => {
        console.log("Ana bildirim ses dosyası çalıyor");
      });
      
      notificationAudio.addEventListener('error', (e) => {
        console.error("Ana bildirim ses dosyası çalma hatası:", e);
      });
      
      notificationAudio.play().catch(e => {
        console.log('Ana bildirim ses dosyası çalma hatası:', e);
        // Sessiz oynatma deneyin
        if (e.name === 'NotAllowedError') {
          console.log("Sessiz oynatma deneniyor...");
          notificationAudio.muted = true;
          notificationAudio.play().catch(e2 => {
            console.log("Sessiz çalma da başarısız oldu:", e2);
            
            // Görsel bildirim göster
            if (showVisualFallback) {
              showVisualNotificationFallback();
            }
          });
        }
      });
    };
    
    // Start playing the alert sound
    alertAudio.play().catch(e => {
      console.log('Alert ses dosyası çalma hatası:', e);
      
      // Kullanıcı etkileşimi olmadan çalma hatası alındığında
      if (e.name === 'NotAllowedError') {
        console.log("Sessiz oynatma deneniyor...");
        alertAudio.muted = true;
        alertAudio.play().catch(e2 => {
          console.log("Sessiz çalma da başarısız oldu:", e2);
          
          // Fallback olarak sadece vibration kullanmayı dene
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
            console.log("Vibration kullanıldı");
          }
          
          // If alert sound fails, try to play at least the notification sound
          const fallbackAudio = new Audio('/notification.mp3');
          fallbackAudio.volume = 0.5;
          fallbackAudio.muted = true;
          fallbackAudio.play().catch(e => {
            console.log('Yedek ses dosyası çalma hatası:', e);
            
            // Görsel bildirim göster
            if (showVisualFallback) {
              showVisualNotificationFallback();
            }
          });
        });
      }
    });
  } catch (error) {
    console.error('Bildirim sesi çalma hatası:', error);
    
    // Ses çalınamadığında görsel bildirim göster
    if (showVisualFallback) {
      showVisualNotificationFallback();
    }
  }
}

/**
 * Ses çalınamadığında gösterilen görsel bildirim
 */
function showVisualNotificationFallback() {
  // JSX kullanmadan standart toast bildirim göster
  toast.success('🔔 Yeni bildirim geldi! Lütfen kontrol edin.', {
    duration: 4000,
    position: 'bottom-center',
    style: {
      background: '#3b82f6', // blue-500
      color: '#ffffff',
      fontWeight: 'bold',
      padding: '16px',
      borderRadius: '8px',
    },
    icon: '🔔',
  });
  
  // Sayfada görsel yanıp sönme efekti (title değiştirme)
  const originalTitle = document.title;
  let interval: number | null = null;
  
  if (document.hidden) {
    // Sayfa arka plandaysa başlığı yanıp söndür
    let messageShown = false;
    interval = window.setInterval(() => {
      document.title = messageShown ? originalTitle : '🔔 Yeni Bildirim!';
      messageShown = !messageShown;
    }, 1000);
    
    // Kullanıcı sayfaya geri döndüğünde normal başlığa dön
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (interval) window.clearInterval(interval);
        document.title = originalTitle;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 10 saniye sonra otomatik olarak temizle
    setTimeout(() => {
      if (interval) window.clearInterval(interval);
      document.title = originalTitle;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, 10000);
  }
}

/**
 * Format notification time
 */
export function formatNotificationTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Az önce';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} dakika önce`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} saat önce`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} gün önce`;
  } else {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'success':
      return 'green';
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
    default:
      return 'blue';
  }
}

/**
 * Tarayıcı bildirimi gösterir
 */
export const showBrowserNotification = async (options: NotificationOptions) => {
  try {
    if (typeof window === 'undefined') return;
    
    console.log('Bildirim gösteriliyor:', options);
    
    // Tarayıcı bildirimi desteği kontrolü
    if (!('Notification' in window)) {
      console.warn('Bu tarayıcı bildirim özelliğini desteklemiyor');
      return;
    }
    
    // Bildirim izni kontrolü
    if (Notification.permission === 'granted') {
      console.log('Bildirim izni mevcut, bildirim gösteriliyor');
      
      // Bildirim göster
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/okullogo.png'
      });
      
      // Kullanıcı bildirime tıkladığında sayfaya odaklan
      notification.onclick = () => {
        console.log('Bildirime tıklandı, pencere odaklanıyor');
        window.focus();
        
        // Özel onClick fonksiyonu varsa çağır
        if (options.onClick) {
          options.onClick();
        }
        
        // URL varsa o sayfaya yönlendir
        if (options.url) {
          console.log(`Bildirim URL'sine yönlendiriliyor: ${options.url}`);
          window.location.href = options.url;
        }
      };
    } else if (Notification.permission !== 'denied') {
      console.log('Bildirim izni yok, izin isteniyor...');
      
      // İzin iste
      const permission = await Notification.requestPermission();
      console.log('Bildirim izni sonucu:', permission);
      
      if (permission === 'granted') {
        console.log('Bildirim izni alındı, bildirimi gösteriliyor');
        showBrowserNotification(options);
      } else {
        console.warn('Bildirim izni reddedildi');
      }
    } else {
      console.warn('Bildirim izni daha önce reddedilmiş');
    }
  } catch (error) {
    console.error('Bildirim gösterilemedi:', error);
  }
};

/**
 * Arıza güncelleme bildirimi gösterir
 */
export const showIssueUpdateNotification = (issue: Issue, previousStatus?: string) => {
  // Durum değişikliği varsa
  if (previousStatus && previousStatus !== issue.status) {
    let title = 'Arıza kaydınız güncellendi';
    let body = `"${issue.device_name}" cihazı için bildiriminizin durumu "${getStatusName(issue.status)}" olarak güncellendi.`;
    
    // Çözüldü durumu için farklı başlık
    if (issue.status === 'cozuldu') {
      title = 'Arıza kaydınız çözüldü!';
    }
    
    showBrowserNotification({
      title,
      body
    });
  } else {
    // Genel güncelleme
    showBrowserNotification({
      title: 'Arıza kaydınız güncellendi',
      body: `"${issue.device_name}" cihazı için bildiriminiz güncellendi.`
    });
  }
};

// Durum adını döndüren yardımcı fonksiyon
const getStatusName = (status: string): string => {
  const statusMap: Record<string, string> = {
    'beklemede': 'Beklemede',
    'atandi': 'Atandı',
    'inceleniyor': 'İnceleniyor',
    'cozuldu': 'Çözüldü',
    'kapatildi': 'Kapatıldı'
  };
  
  return statusMap[status] || status;
}; 