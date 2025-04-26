import { Issue } from './supabase';

// Sesli bildirim için sabit
const NOTIFICATION_ALERT_SOUND = '/notification-alert.mp3';

interface NotificationOptions {
  title: string;
  body: string;
}

/**
 * Bildirim sesini çalar (sadece alert sesi)
 */
export const playAlertSound = () => {
  try {
    if (typeof window === 'undefined') return;
    
    console.log('Bildirim sesi çalınıyor: notification-alert.mp3');
    
    // Yeni bir ses nesnesi oluştur
    const sound = new Audio(NOTIFICATION_ALERT_SOUND);
    
    // Ses seviyesini maksimuma ayarla
    sound.volume = 1.0;
    
    // Önce ses dosyasını yükle
    sound.load();
    
    // Ses dosyası yükleme hatası
    sound.onerror = (error) => {
      console.error('Bildirim sesi çalınamadı (onError):', error);
    };
    
    // Alternatif yöntem 1: Doğrudan play metodu
    const playPromise = sound.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Bildirim sesi başarıyla çalındı');
        })
        .catch(error => {
          console.error('Bildirim sesi çalınamadı (promise):', error);
          
          // Alternatif yöntem 2: Yeni bir Audio nesnesi ile tekrar dene
          try {
            const alternativeSound = new Audio('/notification-alert.mp3');
            alternativeSound.volume = 1.0;
            alternativeSound.play()
              .then(() => console.log('Alternatif yöntemle ses çalındı'))
              .catch(err => console.error('Alternatif yöntem de başarısız oldu:', err));
          } catch (fallbackError) {
            console.error('Tüm ses çalma yöntemleri başarısız oldu:', fallbackError);
          }
        });
    }
  } catch (error) {
    console.error('Bildirim sesi çalınamadı (genel hata):', error);
    
    // Son çare olarak direkt bir ses nesnesi oluşturup çal
    try {
      const emergencySound = document.createElement('audio');
      emergencySound.src = '/notification-alert.mp3';
      emergencySound.volume = 1.0;
      document.body.appendChild(emergencySound);
      
      // Hemen oynat
      emergencySound.play()
        .then(() => {
          // Oynatma başarılı olduğunda elementi temizle
          setTimeout(() => {
            document.body.removeChild(emergencySound);
          }, 2000); // 2 saniye sonra temizle
          console.log('Acil yöntemle ses çalındı');
        })
        .catch(() => {
          // Temizleme
          document.body.removeChild(emergencySound);
          console.error('Acil yöntem de başarısız oldu');
        });
    } catch (emergencyError) {
      console.error('Hiçbir ses çalma yöntemi çalışmıyor:', emergencyError);
    }
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