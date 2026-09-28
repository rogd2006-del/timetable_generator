import connectDB from "@/lib/db";
import Faculty from "@/models/Faculty";
import { getSession, unauthorized } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const faculty = await Faculty.find({ owner: session.sub }).sort({ createdAt: -1 });
  return Response.json({ success: true, data: faculty });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const { name, employeeId, email, department, subjects, unavailableSlots } = body || {};
    if (!name || !employeeId || !email || !department) {
      return Response.json(
        { success: false, message: "name, employeeId, email and department are required." },
        { status: 400 }
      );
    }
    await connectDB();
    const faculty = await Faculty.create({
      name,
      employeeId,
      email,
      department,
      subjects: subjects || [],
      unavailableSlots: unavailableSlots || [],
      owner: session.sub,
    });
    return Response.json({ success: true, data: faculty }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        { success: false, message: "A faculty member with this employee ID already exists." },
        { status: 409 }
      );
    }
    console.error("create faculty error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
