import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ success: false, user: null }, { status: 200 });
  }
  return Response.json({
    success: true,
    user: { id: session.sub, name: session.name, role: session.role },
  });
}
