import connectDB from "@/lib/db";
import Classroom from "@/models/Classroom";
import { getSession, unauthorized } from "@/lib/auth";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  try {
    const body = await request.json();
    await connectDB();
    const classroom = await Classroom.findOneAndUpdate(
      { _id: id, owner: session.sub },
      body,
      { new: true, runValidators: true }
    );
    if (!classroom) {
      return Response.json({ success: false, message: "Classroom not found." }, { status: 404 });
    }
    return Response.json({ success: true, data: classroom });
  } catch (err) {
    console.error("update classroom error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  await connectDB();
  const deleted = await Classroom.findOneAndDelete({ _id: id, owner: session.sub });
  if (!deleted) {
    return Response.json({ success: false, message: "Classroom not found." }, { status: 404 });
  }
  return Response.json({ success: true });
}
