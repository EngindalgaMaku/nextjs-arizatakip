import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hüsniye Özdilek Bilişim Alanı Şeflik Yönetici Paneli",
  description: "Hüsniye Özdilek Bilişim Alanı Şeflik için yönetici kontrol paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
