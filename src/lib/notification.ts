import { Issue } from './supabase';

// Ses dosyaları
const NOTIFICATION_SOUND = '/notification.mp3';
const NOTIFICATION_RETURN_SOUND = '/notification-return.mp3';

interface NotificationOptions {
  title: string;
  body: string;
  sound?: 'notification' | 'notification-return' | 'none';
}

/**
 * Bildirim sesini çalar
 */
export const playNotificationSound = (type: 'notification' | 'notification-return' = 'notification') => {
  try {
    if (typeof window === 'undefined') return;
    
    const sound = new Audio(type === 'notification' ? NOTIFICATION_SOUND : NOTIFICATION_RETURN_SOUND);
    
    // Ses dosyası yükleme hatası
    sound.onerror = (error) => {
      console.error('Bildirim sesi çalınamadı:', error);
    };
    
    // Sesi çal
    sound.play().catch(error => {
      console.error('Bildirim sesi çalınamadı:', error);
    });
  } catch (error) {
    console.error('Bildirim sesi çalınamadı:', error);
  }
};

/**
 * Tarayıcı bildirimi gösterir
 */
export const showBrowserNotification = async (options: NotificationOptions) => {
  try {
    if (typeof window === 'undefined') return;
    
    // Tarayıcı bildirimi desteği kontrolü
    if (!('Notification' in window)) {
      console.warn('Bu tarayıcı bildirim özelliğini desteklemiyor');
      return;
    }
    
    // Bildirim izni kontrolü
    if (Notification.permission === 'granted') {
      // Bildirim göster
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/okullogo.png'
      });
      
      // Ses çal
      if (options.sound && options.sound !== 'none') {
        playNotificationSound(options.sound);
      }
      
      // Kullanıcı bildirime tıkladığında sayfaya odaklan
      notification.onclick = () => {
        window.focus();
      };
    } else if (Notification.permission !== 'denied') {
      // İzin iste
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        showBrowserNotification(options);
      }
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
    let sound: 'notification' | 'notification-return' = 'notification';
    
    // Çözüldü durumu için farklı ses
    if (issue.status === 'cozuldu') {
      title = 'Arıza kaydınız çözüldü!';
      sound = 'notification-return';
    }
    
    showBrowserNotification({
      title,
      body,
      sound
    });
  } else {
    // Genel güncelleme
    showBrowserNotification({
      title: 'Arıza kaydınız güncellendi',
      body: `"${issue.device_name}" cihazı için bildiriminiz güncellendi.`,
      sound: 'notification'
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