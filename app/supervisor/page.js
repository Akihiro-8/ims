import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/logout-button";
import SupervisorWorkspace from "@/app/components/supervisor-workspace";
import { requireRole, roleLabels } from "@/utils/auth";
import { listSupervisorEvaluationTargetsByUserId } from "@/utils/ims-data";

export default async function SupervisorPage() {
  const user = await requireRole("supervisor");

  if (!user) {
    redirect("/");
  }

  const records = await listSupervisorEvaluationTargetsByUserId(user.id);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>Supervisor workspace</h1>
          <p>
            Signed in as {user.name}.
          </p>
        </div>
        <LogoutButton />
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Supervisor profile</h2>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Department: {user.supervisorProfile?.department || "Not set yet"}</p>
          <Link className="secondary-button action-link" href="/profile">
            Edit profile
          </Link>
        </article>
      </section>

      <SupervisorWorkspace records={records} />
    </main>
  );
}
