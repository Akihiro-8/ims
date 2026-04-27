import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LogoutButton from "@/app/components/logout-button";
import { requireRole, roleLabels } from "@/utils/auth";
import { formatDisplayDate } from "@/utils/format-date";
import { listCompanyApplicationsByUserId } from "@/utils/ims-data";

export default async function CompanyApplicationDetailPage({ params }) {
  const user = await requireRole("company");

  if (!user) {
    redirect("/");
  }

  const resolvedParams = await params;
  const applications = await listCompanyApplicationsByUserId(user.id);
  const application = applications.find((item) => String(item.id) === resolvedParams.applicationId);

  if (!application) {
    notFound();
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>Application details</h1>
          <p>{application.studentName} for {application.title}</p>
        </div>
        <div className="actions-row">
          <Link className="secondary-button" href="/company">
            Back
          </Link>
          <LogoutButton />
        </div>
      </section>

      <section className="workspace-stack">
        <section className="panel-shell">
          <div className="detail-list">
            <p>Student: {application.studentName}</p>
            <p>Email: {application.studentEmail}</p>
            <p>Department: {application.department || "Not set"}</p>
            <p>Major: {application.major || "Not set"}</p>
            <p>Year: {application.year || "Not set"}</p>
            <p>Internship: {application.title}</p>
            <p>Applied on: {formatDisplayDate(application.applicationDate)}</p>
            <p>Status: {application.status}</p>
            <p>
              CV file:{" "}
              {application.resumeFile ? (
                <a className="file-link" href={application.resumeFile} target="_blank" rel="noreferrer">
                  Open uploaded PDF
                </a>
              ) : (
                "Not provided"
              )}
            </p>
            <p>
              Internship record:{" "}
              {application.internshipRecordId ? `Created #${application.internshipRecordId}` : "Not created yet"}
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
