import { NextResponse } from "next/server";
import {
  createSessionToken,
  createUserWithProfile,
  getDashboardPath,
  getSessionCookie,
  getUserByEmail,
  getUserById,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "@/utils/auth";

function createSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function GET(request) {
  const session = verifySessionToken(request.cookies.get(getSessionCookie().name)?.value);

  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await getUserById(session.sub);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: createSafeUser(user),
    redirectTo: getDashboardPath(user.role),
  });
}

export async function POST(request) {
  const body = await request.json();
  const { action } = body;
  const sessionCookie = getSessionCookie();

  if (action === "logout") {
    const response = NextResponse.json({
      message: "Signed out successfully.",
      redirectTo: "/",
    });
    response.cookies.set(sessionCookie.name, "", {
      ...sessionCookie.options,
      maxAge: 0,
    });
    return response;
  }

  if (action === "register") {
    const role = body.role;
    const name = role === "company" ? body.companyName?.trim() : body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const user = await createUserWithProfile({
      name,
      email,
      password: hashPassword(password),
      role,
      profile: body,
    });

    const response = NextResponse.json({
      message: "Account created successfully.",
      redirectTo: getDashboardPath(user.role),
      user: createSafeUser(user),
    });

    response.cookies.set(sessionCookie.name, createSessionToken(user), sessionCookie.options);
    return response;
  }

  if (action === "login") {
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await getUserByEmail(email);

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const response = NextResponse.json({
      message: "Signed in successfully.",
      redirectTo: getDashboardPath(user.role),
      user: createSafeUser(user),
    });

    response.cookies.set(sessionCookie.name, createSessionToken(user), sessionCookie.options);
    return response;
  }

  return NextResponse.json({ error: "Unsupported authentication action." }, { status: 400 });
}
