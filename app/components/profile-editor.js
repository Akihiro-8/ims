"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfileEditor({ user }) {
  const router = useRouter();
  const isCompany = user.role === "company";
  const [form, setForm] = useState({
    name: isCompany ? user.companyProfile?.companyName || user.name || "" : user.name || "",
    email: user.email || "",
    phone: user.studentProfile?.phone || user.companyProfile?.phone || "",
    department: user.studentProfile?.department || user.supervisorProfile?.department || "",
    major: user.studentProfile?.major || "",
    year: user.studentProfile?.year || "",
    companyName: user.companyProfile?.companyName || "",
    industry: user.companyProfile?.industry || "",
    location: user.companyProfile?.location || "",
    contactPerson: user.companyProfile?.contactPerson || "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update profile.");
      }

      setMessage(data.message);
      router.push("/" + user.role);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="workspace-stack">
      <section className="panel-shell">
        <div className="section-head">
          <h2>Edit profile</h2>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isCompany ? (
            <label>
              Full name
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
          ) : null}

          {!isCompany ? (
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>
          ) : null}

          {user.role === "student" ? (
            <>
              <label>
                Phone
                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                Department
                <input
                  type="text"
                  value={form.department}
                  onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                />
              </label>
              <label>
                Major
                <input
                  type="text"
                  value={form.major}
                  onChange={(event) => setForm((current) => ({ ...current, major: event.target.value }))}
                />
              </label>
              <label>
                Year
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={form.year}
                  onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
                />
              </label>
            </>
          ) : null}

          {user.role === "company" ? (
            <>
              <label>
                Company name
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                      companyName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Industry
                <input
                  type="text"
                  value={form.industry}
                  onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                />
              </label>
              <label>
                Location
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
              <label>
                Phone
                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                Contact person
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))}
                />
              </label>
            </>
          ) : null}

          {user.role === "supervisor" ? (
            <label>
              Department
              <input
                type="text"
                value={form.department}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              />
            </label>
          ) : null}

          <div className="actions-row">
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
            <button className="secondary-button" onClick={() => router.push("/" + user.role)} type="button">
              Cancel
            </button>
          </div>
        </form>

        {message ? <p className="status-message success">{message}</p> : null}
        {error ? <p className="status-message error">{error}</p> : null}
      </section>
    </section>
  );
}
