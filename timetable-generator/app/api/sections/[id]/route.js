import connectDB from "@/lib/db";
import Section from "@/models/Section";
import { getSession, unauthorized } from "@/lib/auth";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  try {
    const body = await request.json();
    await connectDB();
    const section = await Section.findOneAndUpdate({ _id: id, owner: session.sub }, body, {
      new: true,
      runValidators: true,
    });
    if (!section) {
      return Response.json({ success: false, message: "Section not found." }, { status: 404 });
    }
    return Response.json({ success: true, data: section });
  } catch (err) {
    console.error("update section error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  await connectDB();
  const deleted = await Section.findOneAndDelete({ _id: id, owner: session.sub });
  if (!deleted) {
    return Response.json({ success: false, message: "Section not found." }, { status: 404 });
  }
  return Response.json({ success: true });
}
