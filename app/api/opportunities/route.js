import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/auth";
import {
  createCompanyOpportunityByUserId,
  listOpenInternshipOpportunities,
  removeCompanyOpportunityByUserId,
} from "@/utils/ims-data";

export async function GET() {
  const opportunities = await listOpenInternshipOpportunities();
  return NextResponse.json({ opportunities });
}

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "company") {
    return NextResponse.json({ error: "Only companies can create opportunities." }, { status: 403 });
  }

  const body = await request.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!body.availableSlots || Number(body.availableSlots) < 1) {
    return NextResponse.json({ error: "Available slots must be at least 1." }, { status: 400 });
  }

  await createCompanyOpportunityByUserId(user.id, {
    title: body.title.trim(),
    description: body.description?.trim(),
    requirements: body.requirements?.trim(),
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    availableSlots: body.availableSlots,
  });

  return NextResponse.json({ message: "Opportunity posted successfully." });
}

export async function DELETE(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "company") {
    return NextResponse.json({ error: "Only companies can remove opportunities." }, { status: 403 });
  }

  const body = await request.json();

  if (!body.opportunityId) {
    return NextResponse.json({ error: "Opportunity is required." }, { status: 400 });
  }

  try {
    await removeCompanyOpportunityByUserId(user.id, Number(body.opportunityId));
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Unable to remove opportunity." }, { status: 400 });
  }

  return NextResponse.json({ message: "Opportunity removed from the posting list." });
}
