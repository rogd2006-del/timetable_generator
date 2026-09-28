import connectDB from "@/lib/db";
import Faculty from "@/models/Faculty";
import { getSession, unauthorized } from "@/lib/auth";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  try {
    const body = await request.json();
    await connectDB();
    const faculty = await Faculty.findOneAndUpdate({ _id: id, owner: session.sub }, body, {
      new: true,
      runValidators: true,
    });
    if (!faculty) {
      return Response.json({ success: false, message: "Faculty not found." }, { status: 404 });
    }
    return Response.json({ success: true, data: faculty });
  } catch (err) {
    console.error("update faculty error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  await connectDB();
  const deleted = await Faculty.findOneAndDelete({ _id: id, owner: session.sub });
  if (!deleted) {
    return Response.json({ success: false, message: "Faculty not found." }, { status: 404 });
  }
  return Response.json({ success: true });
}
