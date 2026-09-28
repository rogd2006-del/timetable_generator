import connectDB from "@/lib/db";
import Course from "@/models/Course";
import { getSession, unauthorized } from "@/lib/auth";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  try {
    const body = await request.json();
    await connectDB();
    const course = await Course.findOneAndUpdate({ _id: id, owner: session.sub }, body, {
      new: true,
      runValidators: true,
    });
    if (!course) {
      return Response.json({ success: false, message: "Course not found." }, { status: 404 });
    }
    return Response.json({ success: true, data: course });
  } catch (err) {
    console.error("update course error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  await connectDB();
  const deleted = await Course.findOneAndDelete({ _id: id, owner: session.sub });
  if (!deleted) {
    return Response.json({ success: false, message: "Course not found." }, { status: 404 });
  }
  return Response.json({ success: true });
}
