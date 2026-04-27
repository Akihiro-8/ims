import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/auth";
import { updateStudentProfileByUserId } from "@/utils/ims-data";

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Only students can update this profile." }, { status: 403 });
  }

  const body = await request.json();

  await updateStudentProfileByUserId(user.id, {
    phone: body.phone?.trim(),
    department: body.department?.trim(),
    major: body.major?.trim(),
    year: body.year,
  });

  return NextResponse.json({ message: "Profile updated successfully." });
}
