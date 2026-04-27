import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/auth";
import {
  listCompanyApplicationsByUserId,
  updateCompanyApplicationStatusByUserId,
} from "@/utils/ims-data";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "company") {
    return NextResponse.json({ error: "Only companies can view applications." }, { status: 403 });
  }

  const applications = await listCompanyApplicationsByUserId(user.id);
  return NextResponse.json({ applications });
}

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "company") {
    return NextResponse.json({ error: "Only companies can update applications." }, { status: 403 });
  }

  const body = await request.json();

  if (!body.applicationId || !body.status) {
    return NextResponse.json({ error: "Application and decision are required." }, { status: 400 });
  }

  try {
    await updateCompanyApplicationStatusByUserId(user.id, Number(body.applicationId), body.status);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update application." }, { status: 400 });
  }

  return NextResponse.json({ message: `Application ${body.status} successfully.` });
}
