import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/logout-button";
import StudentWorkspace from "@/app/components/student-workspace";
import { requireRole, roleLabels } from "@/utils/auth";
import {
  listOpenInternshipOpportunities,
  listStudentApplicationsByUserId,
  listStudentInternshipRecordsByUserId,
} from "@/utils/ims-data";

export default async function StudentPage() {
  const user = await requireRole("student");

  if (!user) {
    redirect("/");
  }

  const [opportunities, applications, records] = await Promise.all([
    listOpenInternshipOpportunities(),
    listStudentApplicationsByUserId(user.id),
    listStudentInternshipRecordsByUserId(user.id),
  ]);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>Student workspace</h1>
          <p>
            Signed in as {user.name}.
          </p>
        </div>
        <LogoutButton />
      </section>

      {/* <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Profile</h2>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Phone: {user.studentProfile?.phone || "Not set yet"}</p>
          <p>Department: {user.studentProfile?.department || "Not set yet"}</p>
          <p>Major: {user.studentProfile?.major || "Not set yet"}</p>
          <p>Year: {user.studentProfile?.year || "Not set yet"}</p>
          <Link className="secondary-button action-link" href="/profile">
            Edit profile
          </Link>
        </article>
      </section> */}

      <StudentWorkspace applications={applications} opportunities={opportunities} records={records} user={user} />
    </main>
  );
}
