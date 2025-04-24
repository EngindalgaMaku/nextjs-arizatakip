import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Öğretmen yetkilendirmesi gerektiren yollar
const TEACHER_PATHS = [
  '/teacher/issues'
];

// Ana yol
const HOME_PATH = '/';

// Giriş yönlendirme yolları 
const TEACHER_AUTH_PATH = '/teacher/login';

// Auth gerektirmeyen yollar (açık yollar)
const PUBLIC_PATHS = [
  '/login', 
  '/register', 
  '/forgot-password',
  '/api/auth',
  '/teacher/login',
  '/teacher-login',
  '/',
  // Statik dosyalar
  '/_next',
  '/favicon.ico'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Statik dosyalar ve public yollar için middleware çalıştırma
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Tarayıcı tarafı doğrulama için client-side yönlendirmeyi kullanıyoruz,
  // middleware'de minimum işlem yaparak hataları önlüyoruz
  
  try {
    // Öğretmen sayfaları için basit kontrol
    if (TEACHER_PATHS.some(path => pathname.startsWith(path))) {
      const teacherSession = request.cookies.get('teacher-session');
      
      if (!teacherSession) {
        return NextResponse.redirect(new URL(TEACHER_AUTH_PATH, request.url));
      }
    }
    
    // Admin sayfaları için sadece client-side doğrulama kullanılacak
    // Burada middleware işlemini atla
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // Hata durumunda ana sayfaya yönlendir
    return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }
}

export const config = {
  matcher: [
    // Sadece öğretmen sayfasında middleware çalıştır
    '/teacher/issues/:path*',
  ],
}; 