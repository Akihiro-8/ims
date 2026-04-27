import Link from "next/link";
import { redirect } from "next/navigation";
import AdminWorkspace from "@/app/components/admin-workspace";
import LogoutButton from "@/app/components/logout-button";
import { requireRole, roleLabels } from "@/utils/auth";
import { getAdminReportSummary, listAdminInternshipReports } from "@/utils/ims-data";

export default async function AdminPage() {
  const user = await requireRole("admin");

  if (!user) {
    redirect("/");
  }

  const [summary, reports] = await Promise.all([
    getAdminReportSummary(),
    listAdminInternshipReports(),
  ]);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>Administration workspace</h1>
          <p>
            Signed in as {user.name}.
          </p>
        </div>
        <LogoutButton />
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Access scope</h2>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
          <Link className="secondary-button action-link" href="/profile">
            Edit profile
          </Link>
        </article>
      </section>

      <AdminWorkspace reports={reports} summary={summary} />
    </main>
  );
}
