import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only_12345"
);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow static files, api auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png' ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  let isValid = false;
  let decodedPayload = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isValid = true;
      decodedPayload = payload;
    } catch (error) {
      // Token is invalid or expired
    }
  }

  if (pathname === '/sign-in') {
    if (isValid) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!isValid) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (decodedPayload?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png).*)'],
};
