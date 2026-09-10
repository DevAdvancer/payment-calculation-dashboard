import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { getUserById } from "../../../../lib/dashboard-store";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only_12345"
);

export async function POST(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await getUserById(payload.sub);
    if (!user || user.status === 'inactive') {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 403 });
    }

    const newToken = await new SignJWT({ 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      permissions: user.permissions || null
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h') // Issue a token valid for another 24 hours
      .sign(JWT_SECRET);

    const response = NextResponse.json({ 
      success: true,
      role: user.role,
      permissions: user.permissions || null
    }, { status: 200 });

    response.cookies.set({
      name: 'auth_token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
