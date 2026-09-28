import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const secretKey = new TextEncoder().encode(JWT_SECRET);
export const AUTH_COOKIE = "timetable_token";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

/** Reads and verifies the auth cookie on the server (Route Handlers / Server Components). */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Convenience for API routes: returns the session or null (caller sends 401). */
export async function requireSession() {
  const session = await getSession();
  return session; // { sub, role, name } or null
}

export function unauthorized(message = "Unauthorized") {
  return Response.json({ success: false, message }, { status: 401 });
}
