import connectDB from "@/lib/db";
import Section from "@/models/Section";
import { getSession, unauthorized } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const sections = await Section.find({ owner: session.sub }).sort({ createdAt: -1 });
  return Response.json({ success: true, data: sections });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const { sectionName, department, semester, studentCount, academicYear } = body || {};
    if (!sectionName || !department || !semester || !studentCount || !academicYear) {
      return Response.json(
        { success: false, message: "All section fields are required." },
        { status: 400 }
      );
    }
    await connectDB();
    const section = await Section.create({
      sectionName,
      department,
      semester,
      studentCount,
      academicYear,
      owner: session.sub,
    });
    return Response.json({ success: true, data: section }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        { success: false, message: "A section with this name already exists." },
        { status: 409 }
      );
    }
    console.error("create section error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
