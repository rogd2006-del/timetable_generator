import { AUTH_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = Response.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}
