import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Yönetici yetkilendirmesi gerektiren yollar
const ADMIN_PATHS = [
  '/dashboard', 
  '/users', 
  '/settings',
  '/products',
  '/orders',
  '/analytics'
];

// Öğretmen yetkilendirmesi gerektiren yollar
const TEACHER_PATHS = [
  '/teacher/issues'
];

// Ana yol
const HOME_PATH = '/';

// Giriş yönlendirme yolları 
const ADMIN_AUTH_PATH = '/login';
const TEACHER_AUTH_PATH = '/teacher/login';

// Auth gerektirmeyen yollar (açık yollar)
const PUBLIC_PATHS = [
  '/login', 
  '/register', 
  '/forgot-password',
  '/api/auth',
  '/teacher/login',
  '/teacher-login',
  // Statik dosyalar
  '/_next',
  '/favicon.ico'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res = NextResponse.next();
  
  // Supabase client oluştur
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Statik dosyalar ve public yollar için middleware çalıştırma
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return res;
  }
  
  // Admin sayfaları için yetkilendirme kontrolü
  if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
    // Admin oturumu kontrolü
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const url = new URL(ADMIN_AUTH_PATH, request.url);
      url.searchParams.set('redirectUrl', pathname);
      return NextResponse.redirect(url);
    }

    return res;
  }
  
  // Öğretmen sayfaları için yetkilendirme kontrolü
  if (TEACHER_PATHS.some(path => pathname.startsWith(path))) {
    // Client tarafında localStorage kontrol edemediğimiz için
    // öğretmen oturumunu bir çerez üzerinden kontrol edebiliriz
    const teacherSession = request.cookies.get('teacher-session');
    
    if (!teacherSession) {
      const url = new URL(TEACHER_AUTH_PATH, request.url);
      return NextResponse.redirect(url);
    }
    
    return res;
  }

  // Eğer kullanıcı giriş yapmışsa ve login sayfasına erişmeye çalışıyorsa dashboard'a yönlendir
  if (pathname === '/login') {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Diğer tüm sayfalar için
  if (pathname === HOME_PATH) {
    return res;
  }

  // İsterseniz varsayılan olarak ana sayfaya yönlendir
  // const url = new URL(HOME_PATH, request.url);
  // return NextResponse.redirect(url);
  
  // Veya sadece normale devam et
  return res;
}

export const config = {
  matcher: [
    /*
     * Tüm yollarda çalıştır, ama aşağıdakileri hariç tut:
     * - API rotaları (/api/)
     * - Statik dosyalar (/_next/static/, /_next/image/, /favicon.ico)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 