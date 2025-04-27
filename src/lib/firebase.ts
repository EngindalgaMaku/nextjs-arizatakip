'use client';

// Firebase yapılandırması
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging, MessagePayload } from 'firebase/messaging';
import { deleteFCMToken, saveFCMToken } from './supabase';
import { useEffect, useState } from 'react';
import { playAlertSound } from './notification';
import { FCM_TOKEN_KEY, FCM_USER_ROLE_KEY } from '@/constants';

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyDCpkjyNxxrzTn3rXM1kuH5zn0pgIORi0g",
  authDomain: "atsis-38f7e.firebaseapp.com",
  projectId: "atsis-38f7e",
  storageBucket: "atsis-38f7e.firebasestorage.app",
  messagingSenderId: "943049988733",
  appId: "1:943049988733:web:e8c073b8760198da65ef14"
};

// Firebase başlatma - singleton pattern
let firebaseAppInstance: FirebaseApp | undefined = undefined;
export const firebaseApp = (): FirebaseApp => {
  if (!firebaseAppInstance && typeof window !== 'undefined') {
    firebaseAppInstance = initializeApp(firebaseConfig);
  }
  return firebaseAppInstance as FirebaseApp;
};

// Tarayıcı kontrolü
const isBrowser = typeof window !== 'undefined';

let messaging: any = null;
let firebaseInitialized = false;

/**
 * Initialize Firebase
 */
export async function initializeFirebase() {
  if (typeof window === 'undefined') {
    return;
  }

  if (firebaseInitialized) {
    return;
  }

  try {
    console.log('Initializing Firebase...');

    // In a real implementation, this would initialize the Firebase app
    // const app = initializeApp({
    //   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    //   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    //   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    //   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    //   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    //   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    // });
    
    // messaging = getMessaging(app);
    
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

/**
 * Request FCM permission and register service worker
 */
export async function requestFCMPermission(userId?: string, userRole?: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    await initializeFirebase();

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers are not supported in this browser');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Register service worker (in a real app)
    // const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    console.log('Requesting FCM token...');
    
    // For the mock implementation, we'll just generate a fake token
    const mockToken = `fcm-mock-token-${Date.now()}`;
    
    // In a real implementation, we would get the actual FCM token:
    // const token = await getToken(messaging, {
    //   vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    //   serviceWorkerRegistration: registration
    // });
    
    if (mockToken) {
      console.log('FCM Token obtained:', mockToken);
      
      // Save token to localStorage
      localStorage.setItem(FCM_TOKEN_KEY, mockToken);
      
      if (userRole) {
        localStorage.setItem(FCM_USER_ROLE_KEY, userRole);
      }
      
      // Save token to database if user ID is provided
      if (userId) {
        await saveFCMToken(userId, mockToken, userRole);
      }
      
      return mockToken;
    } else {
      console.log('Failed to obtain FCM token');
      return null;
    }
  } catch (error) {
    console.error('Error requesting FCM permission:', error);
    return null;
  }
}

/**
 * Show browser notification
 */
export function showBrowserNotification({ title, body }: { title: string; body: string }) {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icons/icon-192x192.png'
          });
        }
      });
    }
  } catch (error) {
    console.error('Error showing browser notification:', error);
  }
}

// Mesaj dinleyicisi kur
export function setupMessageListener(
  messaging: Messaging,
  callback: (payload: any) => void
) {
  if (!isBrowser || !messaging) return;
  
  console.log('Mesaj dinleyicisi kuruldu');
  
  return onMessage(messaging, (payload) => {
    console.log('Ön planda mesaj alındı:', payload);
    callback(payload);
  });
}

// Service Worker'a rol bilgisini gönder
export const sendRoleToServiceWorker = async (role: string): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker bu tarayıcıda desteklenmiyor.');
      return false;
    }

    // Service worker controller kontrolü
    if (navigator.serviceWorker.controller === null) {
      console.log('Service worker henüz aktif değil, rol bilgisi gönderilemedi');
      // Service worker hazır olduğunda rol bilgisini gönder
      await navigator.serviceWorker.ready;
      
      // Controller hala null ise, rol gönderme işlemini belirli aralıklarla tekrar dene
      if (navigator.serviceWorker.controller === null) {
        console.log('Service worker controller hala null, rol gönderilemedi');
        return false;
      }
    }

    // Service worker'a rol bilgisini gönder
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_USER_ROLE',
      role
    });
    
    console.log(`Kullanıcı rolü (${role}) service worker'a gönderildi`);
    return true;
  } catch (error) {
    console.error('Service worker\'a rol gönderirken hata:', error);
    return false;
  }
};

// FCM tokenını temizle (çıkış yapma vb. durumlarda)
export const clearFCMToken = async (): Promise<boolean> => {
  try {
    // localStorage'daki token ve kullanıcı bilgilerini sil
    const token = localStorage.getItem('fcm_token');
    const userId = localStorage.getItem('fcm_user_id');
    
    if (token && userId) {
      // Token'ı veritabanından sil
      await deleteFCMToken(userId);
    }
    
    // localStorage'dan temizle
    localStorage.removeItem('fcm_token');
    localStorage.removeItem('fcm_user_id');
    localStorage.removeItem('fcm_user_role');
        
    console.log('FCM token temizlendi');
    return true;
  } catch (error) {
    console.error('FCM token temizlenirken hata:', error);
    return false;
  }
};

// Window türü için global tanım ekle
declare global {
  interface Window {
    // No need to declare playAlertSound here since we're importing it
  }
}

export default firebaseApp; 