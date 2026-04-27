import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/utils/auth";
import {
  listStudentInternshipRecordsByUserId,
  saveStudentInternshipReportByUserId,
} from "@/utils/ims-data";

const MAX_REPORT_FILE_SIZE = 50 * 1024 * 1024;

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Only students can view internship reports." }, { status: 403 });
  }

  const records = await listStudentInternshipRecordsByUserId(user.id);
  return NextResponse.json({ records });
}

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Only students can submit internship reports." }, { status: 403 });
  }

  let formData;

  try {
    formData = await request.formData();
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to read the report submission.") },
      { status: 400 }
    );
  }

  const recordId = formData.get("recordId");
  const file = formData.get("reportFile");

  if (!recordId) {
    return NextResponse.json({ error: "Internship record is required." }, { status: 400 });
  }

  if (!file || typeof file === "string" || file.size === 0) {
    return NextResponse.json({ error: "Internship report PDF is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF internship reports are allowed." }, { status: 400 });
  }

  if (file.size > MAX_REPORT_FILE_SIZE) {
    return NextResponse.json({ error: "Internship report PDF must be 50 MB or smaller." }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "reports");
  await mkdir(uploadsDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${user.id}-${Number(recordId)}-${Date.now()}-${safeName}`;
  const filePath = path.join(uploadsDir, fileName);
  let fileBuffer;

  try {
    fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);
    await saveStudentInternshipReportByUserId(user.id, Number(recordId), `/uploads/reports/${fileName}`);
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to submit internship report.") },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: "Internship report submitted successfully." });
}
