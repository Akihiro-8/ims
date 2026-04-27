import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/auth";
import { updateUserProfileByUserId } from "@/utils/ims-data";

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json();
  const name = user.role === "company" ? body.companyName?.trim() : body.name?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  if (user.role === "company" && !body.companyName?.trim()) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  try {
    await updateUserProfileByUserId(user.id, user.role, {
      ...body,
      name,
      email,
      companyName: body.companyName?.trim(),
      industry: body.industry?.trim(),
      location: body.location?.trim(),
      phone: body.phone?.trim(),
      contactPerson: body.contactPerson?.trim(),
      department: body.department?.trim(),
      major: body.major?.trim(),
      year: body.year,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update profile." }, { status: 400 });
  }

  return NextResponse.json({ message: "Profile updated successfully." });
}
