import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/utils/auth";
import {
  cancelStudentApplicationByUserId,
  createStudentApplication,
  listStudentApplicationsByUserId,
} from "@/utils/ims-data";

const MAX_CV_FILE_SIZE = 50 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Only students can view applications." }, { status: 403 });
  }

  const applications = await listStudentApplicationsByUserId(user.id);
  return NextResponse.json({ applications });
}

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Only students can create applications." }, { status: 403 });
  }

  const formData = await request.formData();
  const internshipId = formData.get("internshipId");
  const file = formData.get("cvFile");

  if (!internshipId) {
    return NextResponse.json({ error: "Internship selection is required." }, { status: 400 });
  }

  if (!file || typeof file === "string" || file.size === 0) {
    return NextResponse.json({ error: "CV PDF is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF CV files are allowed." }, { status: 400 });
  }

  if (file.size > MAX_CV_FILE_SIZE) {
    return NextResponse.json({ error: "CV PDF must be 50 MB or smaller." }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "cvs");
  await mkdir(uploadsDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${user.id}-${Number(internshipId)}-${Date.now()}-${safeName}`;
  const filePath = path.join(uploadsDir, fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, fileBuffer);

  try {
    await createStudentApplication({
      userId: user.id,
      internshipId: Number(internshipId),
      resumeFile: `/uploads/cvs/${fileName}`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to create application." }, { status: 400 });
  }

  return NextResponse.json({ message: "Application submitted successfully." });
}

export async function DELETE(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Only students can cancel applications." }, { status: 403 });
  }

  const body = await request.json();

  if (!body.applicationId) {
    return NextResponse.json({ error: "Application is required." }, { status: 400 });
  }

  try {
    await cancelStudentApplicationByUserId(user.id, Number(body.applicationId));
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Unable to cancel application." }, { status: 400 });
  }

  return NextResponse.json({ message: "Application cancelled successfully." });
}
