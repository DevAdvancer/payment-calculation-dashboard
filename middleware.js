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

  const protectedPages = ['dashboard', 'payment', 'monthly', 'defaulter', 'history', 'expenses', 'placement', 'laidoff', 'po-details', 'notifications'];

  if (pathname === '/sign-in') {
    if (isValid) {
      let dest = '/dashboard';
      if (decodedPayload?.permissions?.pages) {
        const allowed = Object.entries(decodedPayload.permissions.pages).find(([_, data]) => data.access === true);
        if (allowed && !decodedPayload.permissions.pages['dashboard']?.access) {
          dest = `/${allowed[0]}`;
        }
      }
      return NextResponse.redirect(new URL(dest, request.url));
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

  // Page-level access control
  const segment = pathname.split('/')[1];
  if (protectedPages.includes(segment)) {
    const perms = decodedPayload?.permissions;
    if (perms && perms.pages) {
      const pagePerm = perms.pages[segment];
      if (!pagePerm || !pagePerm.access) {
        return NextResponse.redirect(new URL('/page-not-found', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png).*)'],
};
