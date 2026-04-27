"use client";

import Link from "next/link";
import { formatDisplayDate } from "@/utils/format-date";

export default function SupervisorWorkspace({ records }) {
  return (
    <section className="workspace-stack">
      <section className="dashboard-grid dashboard-grid-wide">
        <article className="dashboard-card">
          <h2>Evaluation summary</h2>
          <p>Approved internship records: {records.length}</p>
          <p>Completed evaluations: {records.filter((record) => record.evaluationId).length}</p>
          <p>Pending evaluations: {records.filter((record) => !record.evaluationId).length}</p>
        </article>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Internship evaluations</h2>
          <p>Each approved internship record can be evaluated and updated by the supervisor.</p>
        </div>

        <div className="cards-list">
          {records.length ? (
            records.map((record) => (
              <article className="dashboard-card" key={record.id}>
                <div className="card-topline">
                  <h3>{record.studentName}</h3>
                  <span className="badge">{record.progressStatus}</span>
                </div>
                <p>Company: {record.companyName}</p>
                <p>Major: {record.major || "Not set"}</p>
                <p>
                  Last evaluation: {record.evaluationDate ? formatDisplayDate(record.evaluationDate) : "Not evaluated yet"}
                </p>
                <Link className="primary-button action-link" href={`/supervisor/evaluations/${record.id}`}>
                  {record.evaluationId ? "Open details" : "Open evaluation"}
                </Link>
              </article>
            ))
          ) : (
            <article className="dashboard-card">
              <h3>No approved records yet</h3>
              <p>Approved internships from the company phase will appear here for supervisor evaluation.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
