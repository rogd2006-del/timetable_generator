import connectDB from "@/lib/db";
import Classroom from "@/models/Classroom";
import { getSession, unauthorized } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();
  const classrooms = await Classroom.find({ owner: session.sub }).sort({ createdAt: -1 });
  return Response.json({ success: true, data: classrooms });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const { roomNumber, building, capacity, type, available } = body || {};
    if (!roomNumber || !capacity) {
      return Response.json(
        { success: false, message: "roomNumber and capacity are required." },
        { status: 400 }
      );
    }
    if (Number(capacity) <= 0) {
      return Response.json(
        { success: false, message: "capacity must be a positive number." },
        { status: 400 }
      );
    }
    await connectDB();
    const classroom = await Classroom.create({
      roomNumber,
      building,
      capacity,
      type: type || "Classroom",
      available: available !== undefined ? available : true,
      owner: session.sub,
    });
    return Response.json({ success: true, data: classroom }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        { success: false, message: "A classroom with this room number already exists." },
        { status: 409 }
      );
    }
    console.error("create classroom error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
