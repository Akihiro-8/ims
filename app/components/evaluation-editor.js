"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDisplayDate } from "@/utils/format-date";

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export default function EvaluationEditor({ record }) {
  const router = useRouter();
  const [form, setForm] = useState({
    score: record.score ?? "",
    feedback: record.feedback ?? "",
    progressStatus: record.progressStatus || "ongoing",
    startDate: toDateInputValue(record.startDate),
    endDate: toDateInputValue(record.endDate),
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
      const response = await fetch("/api/supervisor-evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: record.id,
          score: form.score,
          feedback: form.feedback,
          progressStatus: form.progressStatus,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save evaluation.");
      }

      setMessage(data.message);
      router.push("/supervisor");
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
          <h2>Evaluation and progress</h2>
          <p>{record.studentName} at {record.companyName}</p>
        </div>

        <div className="detail-list">
          <p>Student: {record.studentName}</p>
          <p>Email: {record.studentEmail}</p>
          <p>Company: {record.companyName}</p>
          <p>Internship: {record.title}</p>
          <p>Department: {record.department || "Not set"}</p>
          <p>Major: {record.major || "Not set"}</p>
          <p>Year: {record.year || "Not set"}</p>
          <p>Current progress: {record.progressStatus}</p>
          <p>Start date: {formatDisplayDate(record.startDate)}</p>
          <p>End date: {formatDisplayDate(record.endDate)}</p>
          <p>
            Internship report:{" "}
            {record.reportFile ? (
              <a className="file-link" href={record.reportFile} target="_blank" rel="noreferrer">
                Open uploaded PDF
              </a>
            ) : (
              "No report uploaded yet"
            )}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Progress status
            <select
              value={form.progressStatus}
              onChange={(event) =>
                setForm((current) => ({ ...current, progressStatus: event.target.value }))
              }
            >
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
            </select>
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
            Score
            <input
              type="number"
              min="0"
              max="100"
              value={form.score}
              onChange={(event) =>
                setForm((current) => ({ ...current, score: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Feedback
            <textarea
              rows="5"
              value={form.feedback}
              onChange={(event) =>
                setForm((current) => ({ ...current, feedback: event.target.value }))
              }
            />
          </label>

          <div className="actions-row">
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : record.evaluationId ? "Update evaluation" : "Submit evaluation"}
            </button>
            <button className="secondary-button" onClick={() => router.push("/supervisor")} type="button">
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
