import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Create response that redirects to login page
  const response = NextResponse.redirect(new URL('/login', request.url));
  
  // Clear cookies by setting them to expire immediately
  response.cookies.set('admin-session', '', { maxAge: 0, path: '/' });
  response.cookies.set('teacher-session', '', { maxAge: 0, path: '/' });
  
  return response;
} 