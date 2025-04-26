import { Issue } from './supabase';

// Ses dosyaları
const NOTIFICATION_SOUND = '/notification.mp3';
const NOTIFICATION_ALERT_SOUND = '/notification-alert.mp3';

interface NotificationOptions {
  title: string;
  body: string;
  sound?: 'notification' | 'notification-alert' | 'none';
}

/**
 * Bildirim sesini çalar
 */
export const playNotificationSound = (type: 'notification' | 'notification-alert' = 'notification') => {
  try {
    if (typeof window === 'undefined') return;
    
    console.log(`Bildirim sesi çalınıyor: ${type}`);
    
    const soundPath = type === 'notification' ? NOTIFICATION_SOUND : NOTIFICATION_ALERT_SOUND;
    console.log(`Ses dosya yolu: ${soundPath}`);
    
    const sound = new Audio(soundPath);
    
    // Ses dosyası yükleme hatası
    sound.onerror = (error) => {
      console.error('Bildirim sesi çalınamadı (onError):', error);
    };
    
    // Sesi çal
    sound.play()
      .then(() => {
        console.log('Bildirim sesi başarıyla çalındı');
      })
      .catch(error => {
        console.error('Bildirim sesi çalınamadı (promise):', error);
      });
  } catch (error) {
    console.error('Bildirim sesi çalınamadı (genel hata):', error);
  }
};

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
      
      // Ses çal
      if (options.sound && options.sound !== 'none') {
        console.log(`Bildirim sesi çalınacak: ${options.sound}`);
        setTimeout(() => {
          if (options.sound === 'notification' || options.sound === 'notification-alert') {
            playNotificationSound(options.sound);
          }
        }, 100);
      }
      
      // Kullanıcı bildirime tıkladığında sayfaya odaklan
      notification.onclick = () => {
        console.log('Bildirime tıklandı, pencere odaklanıyor');
        window.focus();
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
    let sound: 'notification' | 'notification-alert' = 'notification';
    
    // Çözüldü durumu için farklı ses
    if (issue.status === 'cozuldu') {
      title = 'Arıza kaydınız çözüldü!';
      sound = 'notification-alert';
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