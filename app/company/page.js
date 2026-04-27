import Link from "next/link";
import { redirect } from "next/navigation";
import CompanyWorkspace from "@/app/components/company-workspace";
import LogoutButton from "@/app/components/logout-button";
import { requireRole, roleLabels } from "@/utils/auth";
import {
  listCompanyApplicationsByUserId,
  listCompanyOpportunitiesByUserId,
} from "@/utils/ims-data";

export default async function CompanyPage() {
  const user = await requireRole("company");

  if (!user) {
    redirect("/");
  }

  const [opportunities, applications] = await Promise.all([
    listCompanyOpportunitiesByUserId(user.id),
    listCompanyApplicationsByUserId(user.id),
  ]);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>Company workspace</h1>
          <p>
            Signed in as {user.companyProfile?.companyName || user.name}.
          </p>
        </div>
        <LogoutButton />
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Organization</h2>
          <p>Company: {user.companyProfile?.companyName || user.name}</p>
          <p>Email: {user.email}</p>
          <p>Industry: {user.companyProfile?.industry || "Not set yet"}</p>
          <p>Location: {user.companyProfile?.location || "Not set yet"}</p>
          <p>Phone: {user.companyProfile?.phone || "Not set yet"}</p>
          <p>Contact person: {user.companyProfile?.contactPerson || "Not set yet"}</p>
          <Link className="secondary-button action-link" href="/profile">
            Edit profile
          </Link>
        </article>
      </section>

      <CompanyWorkspace applications={applications} opportunities={opportunities} />
    </main>
  );
}
