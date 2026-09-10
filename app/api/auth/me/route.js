import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { getUserById, updateUser } from "../../../../lib/dashboard-store";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only_12345"
);

export async function GET(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = await getUserById(payload.sub);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    const { password, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = await getUserById(payload.sub);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    const body = await request.json();
    const patch = {};
    
    if (body.name) {
      patch.name = body.name;
    }
    if (body.password && body.password.length >= 6) {
      patch.password = await bcrypt.hash(body.password, 10);
    }
    
    const updated = await updateUser(user.id, patch);
    
    // If they changed name, update JWT
    const newToken = await new SignJWT({ 
      sub: updated.id, 
      email: updated.email, 
      role: updated.role,
      permissions: updated.permissions || null
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
      
    const response = NextResponse.json({ success: true, user: updated });
    response.cookies.set({
      name: 'auth_token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });
    
    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
