import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Demo modu - üretimde false olmalı
const DEMO_MODE = false;

export function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const response = NextResponse.next();

    // Admin ve öğretmen kısmı için yönlendirme kuralları
    if (path.startsWith('/admin')) {
      // Admin dashboard erişimi kontrolü
      if (path.startsWith('/admin/dashboard')) {
        // Demo modda admin kontrolü bypass edilir
        if (DEMO_MODE) {
          console.log('Demo mod: Admin kimlik doğrulama atlandı');
          return response;
        }
        
        const adminSessionCookie = request.cookies.get('admin-session');
        if (!adminSessionCookie?.value) {
          // Session yoksa login sayfasına yönlendir
          return NextResponse.redirect(new URL('/login', request.url));
        }
        
        try {
          // Session değerini ayrıştır
          const session = JSON.parse(adminSessionCookie.value);
          if (!session || !session.role || session.role !== 'admin') {
            return NextResponse.redirect(new URL('/login', request.url));
          }
        } catch (error) {
          console.error('Admin session ayrıştırma hatası:', error);
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
    } else if (path.startsWith('/teacher')) {
      // Öğretmen bölümü erişimi kontrolü
      if (path.startsWith('/teacher/issues')) {
        // Demo modda öğretmen kontrolü bypass edilir
        if (DEMO_MODE) {
          console.log('Demo mod: Öğretmen kimlik doğrulama atlandı');
          return response;
        }
        
        const teacherSessionCookie = request.cookies.get('teacher-session');
        if (!teacherSessionCookie?.value) {
          // Session yoksa login sayfasına yönlendir
          return NextResponse.redirect(new URL('/teacher/login', request.url));
        }
        
        try {
          // Session değerini ayrıştır
          const session = JSON.parse(teacherSessionCookie.value);
          if (!session || !session.role || session.role !== 'teacher') {
            return NextResponse.redirect(new URL('/teacher/login', request.url));
          }
        } catch (error) {
          console.error('Öğretmen session ayrıştırma hatası:', error);
          return NextResponse.redirect(new URL('/teacher/login', request.url));
        }
      }
    }

    return response;
  } catch (error) {
    // Genel hata durumunda 
    console.error('Middleware hatası:', error);
    
    // Demo modda hataları görmezden gel ve geçişe izin ver
    if (DEMO_MODE) {
      console.warn('Demo mod: Middleware hatası yoksayıldı');
      return NextResponse.next();
    }
    
    // Hata durumunda ana sayfaya yönlendir
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
  ],
}; 