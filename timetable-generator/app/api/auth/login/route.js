import connectDB from "@/lib/db";
import User from "@/models/User";
import { verifyPassword, signToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return Response.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return Response.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

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
    console.error("login error", err);
    return Response.json(
      { success: false, message: err.message || "Login failed." },
      { status: 500 }
    );
  }
}
