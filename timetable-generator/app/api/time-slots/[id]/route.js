import connectDB from "@/lib/db";
import TimeSlot from "@/models/TimeSlot";
import { getSession, unauthorized } from "@/lib/auth";

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  try {
    const body = await request.json();
    await connectDB();
    const slot = await TimeSlot.findOneAndUpdate({ _id: id, owner: session.sub }, body, {
      new: true,
      runValidators: true,
    });
    if (!slot) {
      return Response.json({ success: false, message: "Time slot not found." }, { status: 404 });
    }
    return Response.json({ success: true, data: slot });
  } catch (err) {
    console.error("update time slot error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  await connectDB();
  const deleted = await TimeSlot.findOneAndDelete({ _id: id, owner: session.sub });
  if (!deleted) {
    return Response.json({ success: false, message: "Time slot not found." }, { status: 404 });
  }
  return Response.json({ success: true });
}
