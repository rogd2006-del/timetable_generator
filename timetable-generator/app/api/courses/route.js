import connectDB from "@/lib/db";
import Course from "@/models/Course";
import { getSession, unauthorized } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const courses = await Course.find({ owner: session.sub })
    .populate("faculty", "name employeeId")
    .populate("section", "sectionName")
    .populate("preferredRoom", "roomNumber")
    .sort({ createdAt: -1 });
  return Response.json({ success: true, data: courses });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const {
      courseCode,
      courseName,
      faculty,
      section,
      credits,
      lecturesPerWeek,
      duration,
      preferredRoom,
      type,
    } = body || {};

    if (!courseCode || !courseName || !faculty || !section || !credits || !lecturesPerWeek) {
      return Response.json(
        {
          success: false,
          message:
            "courseCode, courseName, faculty, section, credits and lecturesPerWeek are required.",
        },
        { status: 400 }
      );
    }

    await connectDB();
    const course = await Course.create({
      courseCode,
      courseName,
      faculty,
      section,
      credits,
      lecturesPerWeek,
      duration: duration || 1,
      preferredRoom: preferredRoom || null,
      type: type || "Lecture",
      owner: session.sub,
    });
    return Response.json({ success: true, data: course }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        {
          success: false,
          message: "This course code already exists for the selected section.",
        },
        { status: 409 }
      );
    }
    console.error("create course error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
