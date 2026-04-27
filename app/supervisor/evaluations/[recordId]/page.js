import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EvaluationEditor from "@/app/components/evaluation-editor";
import LogoutButton from "@/app/components/logout-button";
import { requireRole, roleLabels } from "@/utils/auth";
import { listSupervisorEvaluationTargetsByUserId } from "@/utils/ims-data";

export default async function EvaluationPage({ params }) {
  const user = await requireRole("supervisor");

  if (!user) {
    redirect("/");
  }

  const resolvedParams = await params;
  const records = await listSupervisorEvaluationTargetsByUserId(user.id);
  const record = records.find((item) => String(item.id) === resolvedParams.recordId);

  if (!record) {
    notFound();
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>Evaluation</h1>
          <p>Signed in as {user.name}.</p>
        </div>
        <div className="actions-row">
          <Link className="secondary-button" href="/supervisor">
            Back
          </Link>
          <LogoutButton />
        </div>
      </section>

      <EvaluationEditor record={record} />
    </main>
  );
}
