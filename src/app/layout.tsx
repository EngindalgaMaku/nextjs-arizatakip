import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
// Remove QueryClient imports
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
// import React from 'react';

// Import the new provider
import { QueryProvider } from "@/providers/QueryProvider"; 
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import Sidebar component with the correct path
import Sidebar from "@/components/Sidebar"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS",
  description: "Hüsniye Özdilek Ticaret M.T.A.L. Arıza Takip Sistemi (ATSİS)",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ATSİS"
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4338CA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Remove useState for queryClient
  // const [queryClient] = React.useState(() => new QueryClient());

  return (
    <html lang="tr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
         {/* Remove QueryProvider wrapper */}
        <AuthProvider>
          {/* Remove the NotificationProvider wrapper */}
          {/* <NotificationProvider> */}
            <div className="flex h-screen bg-gray-100">
              {/* <Sidebar /> */}
              {/* Remove the QueryProvider wrapper */}
              {/* <QueryProvider> */}
                {children}
                <Toaster position="bottom-right" />
              {/* </QueryProvider> */}
            </div>
          {/* </NotificationProvider> */}
        </AuthProvider>
      </body>
    </html>
  );
}
