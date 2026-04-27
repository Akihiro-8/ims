"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDisplayDate } from "@/utils/format-date";

export default function CompanyWorkspace({ opportunities, applications: initialApplications }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    startDate: "",
    endDate: "",
    availableSlots: 1,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionKey, setDecisionKey] = useState("");
  const [removingOpportunityId, setRemovingOpportunityId] = useState(null);
  const applications = initialApplications;

  function getErrorMessage(error, fallback) {
    return error instanceof Error ? error.message : fallback;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to post opportunity.");
      }

      setMessage(data.message);
      setForm({
        title: "",
        description: "",
        requirements: "",
        startDate: "",
        endDate: "",
        availableSlots: 1,
      });
      router.refresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to post opportunity."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveOpportunity(opportunityId) {
    const confirmed = window.confirm(
      "Remove this full opportunity from the posting list? Students will no longer see it."
    );

    if (!confirmed) {
      return;
    }

    setRemovingOpportunityId(opportunityId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/opportunities", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opportunityId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to remove opportunity.");
      }

      setMessage(data.message);
      router.refresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to remove opportunity."));
    } finally {
      setRemovingOpportunityId(null);
    }
  }

  async function handleDecision(applicationId, status) {
    const confirmed = window.confirm(
      status === "approved"
        ? "Approve this application? This decision cannot be changed later."
        : "Reject this application? This decision cannot be changed later."
    );

    if (!confirmed) {
      return;
    }

    const nextDecisionKey = `${applicationId}:${status}`;
    setDecisionKey(nextDecisionKey);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/company-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update application.");
      }

      setMessage(data.message);
      router.refresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to update application."));
    } finally {
      setDecisionKey("");
    }
  }

  return (
    <section className="workspace-stack">
      <section className="dashboard-grid dashboard-grid-wide">
        <article className="dashboard-card">
          <h2>Post internship opportunity</h2>
          <form className="auth-form compact-form" onSubmit={handleSubmit}>
            <label>
              Title
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows="4"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label>
              Requirements
              <textarea
                rows="3"
                value={form.requirements}
                onChange={(event) =>
                  setForm((current) => ({ ...current, requirements: event.target.value }))
                }
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </label>
            <label>
              Available slots
              <input
                type="number"
                min="1"
                value={form.availableSlots}
                onChange={(event) =>
                  setForm((current) => ({ ...current, availableSlots: event.target.value }))
                }
                required
              />
            </label>
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Posting..." : "Post opportunity"}
            </button>
          </form>
        </article>

        <article className="dashboard-card">
          <h2>Publishing summary</h2>
          <p>Active postings: {opportunities.length}</p>
          <p>Applications received: {applications.length}</p>
        </article>
      </section>

      {message ? <p className="status-message success">{message}</p> : null}
      {error ? <p className="status-message error">{error}</p> : null}

      <section className="section-block">
        <div className="section-head">
          <h2>Your posted opportunities</h2>
          <p>These are the internships currently available to student applicants.</p>
        </div>

        <div className="cards-list">
          {opportunities.length ? (
            opportunities.map((opportunity) => (
              <article className="dashboard-card" key={opportunity.id}>
                <div className="card-topline">
                  <h3>{opportunity.title}</h3>
                  <span className={`badge ${opportunity.isFull ? "status-completed" : ""}`}>
                    {opportunity.isFull ? "Full" : "Open"}
                  </span>
                </div>
                <p>{opportunity.description || "No description yet."}</p>
                <p>Requirements: {opportunity.requirements || "To be confirmed"}</p>
                <p>Start: {formatDisplayDate(opportunity.startDate)}</p>
                <p>End: {formatDisplayDate(opportunity.endDate)}</p>
                <p>Slots: {opportunity.approvedCount} / {opportunity.availableSlots} approved</p>
                <p>Joined: {opportunity.joinedCount}</p>
                {opportunity.isFull ? (
                  <button
                    className="secondary-button"
                    disabled={removingOpportunityId === opportunity.id}
                    onClick={() => handleRemoveOpportunity(opportunity.id)}
                    type="button"
                  >
                    {removingOpportunityId === opportunity.id ? "Removing..." : "Remove post"}
                  </button>
                ) : null}
              </article>
            ))
          ) : (
            <article className="dashboard-card">
              <h3>No postings yet</h3>
              <p>Create the first internship opportunity to feed the student application flow.</p>
            </article>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Student applications</h2>
          <p>Review applicants for your internships and confirm or reject placements.</p>
        </div>

        <div className="cards-list">
          {applications.length ? (
            applications.map((application) => (
              <article className="dashboard-card" key={application.id}>
                <div className="card-topline">
                  <h3>{application.studentName}</h3>
                  <span className={`badge status-${application.status}`}>{application.status}</span>
                </div>
                <p>Internship: {application.title}</p>
                <p>Major: {application.major || "Not set"}</p>
                <p>Department: {application.department || "Not set"}</p>
                <p>Applied on: {formatDisplayDate(application.applicationDate)}</p>
                <Link className="secondary-button action-link" href={`/company/applications/${application.id}`}>
                  Open details
                </Link>

                <div className="actions-row">
                  <button
                    className="primary-button"
                    disabled={application.status !== "pending" || decisionKey === `${application.id}:approved`}
                    onClick={() => handleDecision(application.id, "approved")}
                    type="button"
                  >
                    {decisionKey === `${application.id}:approved`
                      ? "Approving..."
                      : application.status === "approved"
                        ? "Approved"
                        : application.status === "rejected"
                          ? "Locked"
                          : "Approve"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={application.status !== "pending" || decisionKey === `${application.id}:rejected`}
                    onClick={() => handleDecision(application.id, "rejected")}
                    type="button"
                  >
                    {decisionKey === `${application.id}:rejected`
                      ? "Rejecting..."
                      : application.status === "rejected"
                        ? "Rejected"
                        : application.status === "approved"
                          ? "Locked"
                          : "Reject"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="dashboard-card">
              <h3>No applications yet</h3>
              <p>Student applications will appear here once people apply to your postings.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
