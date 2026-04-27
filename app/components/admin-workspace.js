"use client";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString();
}

function formatMetric(value) {
  if (value === null || value === undefined) {
    return "0";
  }

  return String(value);
}

export default function AdminWorkspace({ summary, reports }) {
  const metrics = [
    { label: "Total users", value: summary.totalUsers },
    { label: "Opportunities", value: summary.totalOpportunities },
    { label: "Applications", value: summary.totalApplications },
    { label: "Approved", value: summary.approvedApplications },
    { label: "Pending", value: summary.pendingApplications },
    { label: "Rejected", value: summary.rejectedApplications },
    { label: "Internship records", value: summary.totalRecords },
    { label: "Evaluations", value: summary.totalEvaluations }
    // { label: "Average score", value: summary.averageEvaluationScore ?? "N/A" },
  ];

  return (
    <section className="workspace-stack">
      <section className="section-block">
        <div className="section-head">
          <h2>System summary</h2>
        </div>

        <div className="metric-grid">
          {metrics.map((metric) => (
            <article className="dashboard-card metric-card" key={metric.label}>
              <p className="metric-label">{metric.label}</p>
              <strong className="metric-value">{formatMetric(metric.value)}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Internship reports</h2>
        </div>

        <div className="cards-list">
          {reports.length ? (
            reports.map((report) => (
              <article className="dashboard-card" key={report.id}>
                <div className="card-topline">
                  <h3>{report.title}</h3>
                  <span className={`badge status-${report.progressStatus}`}>{report.progressStatus}</span>
                </div>
                <p>Student: {report.studentName}</p>
                <p>Email: {report.studentEmail}</p>
                <p>Department: {report.department || "Not set"}</p>
                <p>Major: {report.major || "Not set"}</p>
                <p>Year: {report.year || "Not set"}</p>
                <p>Company: {report.companyName}</p>
                <p>Application status: {report.applicationStatus}</p>
                <p>Application date: {formatDate(report.applicationDate)}</p>
                <p>Internship start: {formatDate(report.startDate)}</p>
                <p>Internship end: {formatDate(report.endDate)}</p>
                <p>Supervisor: {report.supervisorName || "No evaluation assigned yet"}</p>
                <p>Evaluation score: {report.score ?? "Not evaluated yet"}</p>
                <p>Evaluation date: {formatDate(report.evaluationDate)}</p>
                <p>Feedback: {report.feedback || "No feedback submitted yet"}</p>
                <p>
                  Final report:{" "}
                  {report.reportFile ? (
                    <a className="file-link" href={report.reportFile} target="_blank" rel="noreferrer">
                      Open submitted report
                    </a>
                  ) : (
                    "Not submitted yet"
                  )}
                </p>
                <p>Report submission date: {formatDate(report.submissionDate)}</p>
              </article>
            ))
          ) : (
            <article className="dashboard-card">
              <h3>No internship reports yet</h3>
              <p>Approved internships and evaluations will appear here as the workflow progresses.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
