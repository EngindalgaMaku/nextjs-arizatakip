'use client';

import React, { useState, useEffect } from 'react';
import { playAlertSound, showBrowserNotification } from '@/lib/notification';

interface NotificationTestButtonProps {
  onTest?: () => void;
}

export const NotificationTestButton: React.FC<NotificationTestButtonProps> = ({
  onTest
}) => {
  const [testing, setTesting] = useState(false);

  const handleTestNotification = () => {
    setTesting(true);
    
    // Ses testi için useEffect kullan
    setTimeout(() => {
      // Play notification sound
      playAlertSound();
      
      // Show browser notification
      showBrowserNotification({
        title: 'Test Bildirimi',
        body: 'Bu bir test bildirimidir. Bildirimler düzgün çalışıyor!'
      });
      
      // Call the optional callback
      if (onTest) {
        onTest();
      }
      
      // Reset button state after a short delay
      setTimeout(() => {
        setTesting(false);
      }, 2000);
    }, 100);
  };

  return (
    <button
      type="button"
      onClick={handleTestNotification}
      disabled={testing}
      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded 
        ${testing 
          ? 'bg-green-100 text-green-800 cursor-not-allowed' 
          : 'bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        }`}
    >
      {testing ? (
        <>
          <svg 
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-green-500" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Gönderildi
        </>
      ) : (
        <>
          <svg 
            className="-ml-0.5 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Test Bildirimi Gönder
        </>
      )}
    </button>
  );
}; 