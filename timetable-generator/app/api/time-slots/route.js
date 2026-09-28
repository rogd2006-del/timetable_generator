import connectDB from "@/lib/db";
import TimeSlot from "@/models/TimeSlot";
import { getSession, unauthorized } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const slots = await TimeSlot.find({ owner: session.sub }).sort({ day: 1, order: 1 });
  return Response.json({ success: true, data: slots });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const { day, startTime, endTime, order, isBreak, label } = body || {};
    if (!day || !startTime || !endTime) {
      return Response.json(
        { success: false, message: "day, startTime and endTime are required." },
        { status: 400 }
      );
    }
    await connectDB();
    const slot = await TimeSlot.create({
      day,
      startTime,
      endTime,
      order: order ?? 0,
      isBreak: !!isBreak,
      label: label || "",
      owner: session.sub,
    });
    return Response.json({ success: true, data: slot }, { status: 201 });
  } catch (err) {
    console.error("create time slot error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
