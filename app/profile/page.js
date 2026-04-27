import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/logout-button";
import ProfileEditor from "@/app/components/profile-editor";
import { getCurrentUser, roleLabels } from "@/utils/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>Edit profile</h1>
          <p>Signed in as {user.companyProfile?.companyName || user.name}.</p>
        </div>
        <div className="actions-row">
          <Link className="secondary-button" href={`/${user.role}`}>
            Back
          </Link>
          <LogoutButton />
        </div>
      </section>

      <ProfileEditor user={user} />
    </main>
  );
}
