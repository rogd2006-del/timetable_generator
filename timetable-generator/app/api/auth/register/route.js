import connectDB from "@/lib/db";
import User from "@/models/User";
import { hashPassword, signToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body || {};

    if (!name || !email || !password) {
      return Response.json(
        { success: false, message: "Name, email and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return Response.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return Response.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: role === "faculty" ? "faculty" : "admin",
    });

    const token = await signToken({ sub: user._id.toString(), role: user.role, name: user.name });

    const res = Response.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
    res.headers.set(
      "Set-Cookie",
      `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
    return res;
  } catch (err) {
    console.error("register error", err);
    return Response.json(
      { success: false, message: err.message || "Registration failed." },
      { status: 500 }
    );
  }
}
