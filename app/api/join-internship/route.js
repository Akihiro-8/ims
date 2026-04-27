import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/auth";
import { joinApprovedInternshipByUserId } from "@/utils/ims-data";

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Only students can join internships." }, { status: 403 });
  }

  const body = await request.json();

  if (!body.applicationId) {
    return NextResponse.json({ error: "Approved application is required." }, { status: 400 });
  }

  try {
    await joinApprovedInternshipByUserId(user.id, Number(body.applicationId));
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Unable to join internship." }, { status: 400 });
  }

  return NextResponse.json({ message: "Internship joined successfully." });
}
