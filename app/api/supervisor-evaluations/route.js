import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/auth";
import {
  listSupervisorEvaluationTargetsByUserId,
  saveSupervisorEvaluationByUserId,
} from "@/utils/ims-data";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "supervisor") {
    return NextResponse.json({ error: "Only supervisors can view evaluations." }, { status: 403 });
  }

  const records = await listSupervisorEvaluationTargetsByUserId(user.id);
  return NextResponse.json({ records });
}

export async function POST(request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "supervisor") {
    return NextResponse.json({ error: "Only supervisors can submit evaluations." }, { status: 403 });
  }

  const body = await request.json();

  if (!body.recordId || body.score === undefined || body.score === null) {
    return NextResponse.json({ error: "Record and score are required." }, { status: 400 });
  }

  const numericScore = Number(body.score);

  if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
    return NextResponse.json({ error: "Score must be between 0 and 100." }, { status: 400 });
  }

  try {
    await saveSupervisorEvaluationByUserId(user.id, Number(body.recordId), {
      score: numericScore,
      feedback: body.feedback?.trim(),
      progressStatus: body.progressStatus || "ongoing",
      startDate: body.startDate || null,
      endDate: body.endDate || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to save evaluation." }, { status: 400 });
  }

  return NextResponse.json({ message: "Evaluation saved successfully." });
}
