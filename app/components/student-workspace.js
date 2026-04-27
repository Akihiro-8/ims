"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDisplayDate } from "@/utils/format-date";

const MAX_CV_FILE_SIZE = 50 * 1024 * 1024;
const MAX_REPORT_FILE_SIZE = 50 * 1024 * 1024;

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function getJoinState(application, hasJoinedInternship) {
  if (application.status !== "approved") {
    return null;
  }

  if (!application.internshipRecordId) {
    return {
      label: "Waiting for company record",
      disabled: true,
      statusText: "Company approval is recorded, but the internship record is not ready yet.",
    };
  }

  if (
    application.internshipProgressStatus === "awaiting_join" ||
    !application.internshipProgressStatus
  ) {
    return {
      label: hasJoinedInternship ? "Already joined another internship" : "Join internship",
      disabled: hasJoinedInternship,
      statusText: "Waiting for you to join",
    };
  }

  if (["ongoing", "completed"].includes(application.internshipProgressStatus)) {
    return {
      label: "Joined",
      disabled: true,
      statusText: "Joined",
    };
  }

  return {
    label: "Unavailable",
    disabled: true,
    statusText: application.internshipProgressStatus || "Unavailable",
  };
}

export default function StudentWorkspace({ user, opportunities, applications, records }) {
  const router = useRouter();
  const [cvMap, setCvMap] = useState({});
  const [reportMap, setReportMap] = useState({});
  const [applicationMessage, setApplicationMessage] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [uploadingReportId, setUploadingReportId] = useState(null);
  const [joiningApplicationId, setJoiningApplicationId] = useState(null);
  const [cancellingApplicationId, setCancellingApplicationId] = useState(null);

  async function handleApply(internshipId) {
    setSubmittingId(internshipId);
    setApplicationMessage("");
    setReportMessage("");
    setError("");

    try {
      const selectedFile = cvMap[internshipId];

      if (!selectedFile) {
        throw new Error("Please upload your CV in PDF format before applying.");
      }

      if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Only PDF CV files are allowed.");
      }

      if (selectedFile.size > MAX_CV_FILE_SIZE) {
        throw new Error("CV PDF must be 50 MB or smaller.");
      }

      const formData = new FormData();
      formData.append("internshipId", String(internshipId));
      formData.append("cvFile", selectedFile);

      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit application.");
      }

      setApplicationMessage(data.message);
      router.refresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to submit application."));
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleJoin(applicationId) {
    setJoiningApplicationId(applicationId);
    setApplicationMessage("");
    setReportMessage("");
    setError("");

    try {
      const response = await fetch("/api/join-internship", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to join internship.");
      }

      setApplicationMessage(data.message);
      router.refresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to join internship."));
    } finally {
      setJoiningApplicationId(null);
    }
  }

  async function handleReportSubmit(recordId) {
    setUploadingReportId(recordId);
    setApplicationMessage("");
    setReportMessage("");
    setError("");

    try {
      const selectedFile = reportMap[recordId];

      if (!selectedFile) {
        throw new Error("Please upload your internship report in PDF format.");
      }

      if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Only PDF internship reports are allowed.");
      }

      if (selectedFile.size > MAX_REPORT_FILE_SIZE) {
        throw new Error("Internship report PDF must be 50 MB or smaller.");
      }

      const formData = new FormData();
      formData.append("recordId", String(recordId));
      formData.append("reportFile", selectedFile);

      const response = await fetch("/api/internship-reports", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit internship report.");
      }

      setReportMessage(data.message);
      router.refresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to submit internship report."));
    } finally {
      setUploadingReportId(null);
    }
  }

  async function handleCancelApplication(applicationId) {
    const confirmed = window.confirm(
      "Cancel this pending application? You can apply again later if the opportunity is still open."
    );

    if (!confirmed) {
      return;
    }

    setCancellingApplicationId(applicationId);
    setApplicationMessage("");
    setReportMessage("");
    setError("");

    try {
      const response = await fetch("/api/applications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to cancel application.");
      }

      setApplicationMessage(data.message);
      router.refresh();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to cancel application."));
    } finally {
      setCancellingApplicationId(null);
    }
  }

  const applicationMap = new Map(applications.map((application) => [application.internshipId, application]));
  const hasJoinedInternship = applications.some((application) =>
    ["ongoing", "completed"].includes(application.internshipProgressStatus)
  );
  const joinedRecords = records.filter((record) => ["ongoing", "completed"].includes(record.progressStatus));

  return (
    <section className="workspace-stack">
      <section className="dashboard-grid dashboard-grid-wide">
        <article className="dashboard-card">
          <h2>Profile summary</h2>
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

        <article className="dashboard-card">
          <h2>Application overview</h2>
          <p>{user.email}</p>
          <p>Applications submitted: {applications.length}</p>
          <p>
            Pending decisions: {applications.filter((application) => application.status === "pending").length}
          </p>
        </article>
      </section>

      {applicationMessage ? <p className="status-message success">{applicationMessage}</p> : null}
      {reportMessage ? <p className="status-message success">{reportMessage}</p> : null}
      {error ? <p className="status-message error">{error}</p> : null}

      <section className="section-block">
        <div className="section-head">
          <h2>Internship opportunities</h2>
        </div>

        <div className="cards-list">
          {opportunities.length ? (
            opportunities.map((opportunity) => {
              const existingApplication = applicationMap.get(opportunity.id);
              const hasApplied = Boolean(existingApplication);
              const isFull = opportunity.isFull && !hasApplied;
              const actionLabel = hasApplied
                ? existingApplication.status === "approved"
                  ? "Approved"
                  : existingApplication.status === "rejected"
                    ? "Rejected"
                    : "Application pending"
                : isFull
                  ? "Full"
                : submittingId === opportunity.id
                  ? "Submitting..."
                  : "Apply now";

              return (
                <article className="dashboard-card" key={opportunity.id}>
                  <div className="card-topline">
                    <h3>{opportunity.title}</h3>
                    <span className="badge">{opportunity.companyName}</span>
                  </div>
                  <p>{opportunity.description || "No description yet."}</p>
                  <p>Requirements: {opportunity.requirements || "To be confirmed"}</p>
                  <p>Industry: {opportunity.industry || "Not specified"}</p>
                  <p>Location: {opportunity.location || "Not specified"}</p>
                  <p>Start: {formatDisplayDate(opportunity.startDate)}</p>
                  <p>End: {formatDisplayDate(opportunity.endDate)}</p>
                  <p>Available slots: {opportunity.availableSlots}</p>
                  <p>Approved slots: {opportunity.approvedCount}</p>
                  <p>Joined students: {opportunity.joinedCount}</p>
                  <p>Status: {opportunity.isFull ? "Full" : "Open"}</p>

                  {hasApplied ? (
                    <p className="muted-note">
                      Application already submitted. You do not need to upload the CV again.
                    </p>
                  ) : isFull ? (
                    <p className="muted-note">This opportunity is full and is no longer accepting new applications.</p>
                  ) : (
                    <label className="inline-label">
                      Upload CV PDF
                      <input
                        accept="application/pdf,.pdf"
                        type="file"
                        onChange={(event) =>
                          setCvMap((current) => ({
                            ...current,
                            [opportunity.id]: event.target.files?.[0] || null,
                          }))
                        }
                      />
                      <span className="field-help">Required. Maximum file size: 50 MB.</span>
                    </label>
                  )}

                  <button
                    className="primary-button"
                    disabled={hasApplied || isFull || submittingId === opportunity.id}
                    onClick={() => handleApply(opportunity.id)}
                    type="button"
                  >
                    {actionLabel}
                  </button>
                </article>
              );
            })
          ) : (
            <article className="dashboard-card">
              <h3>No opportunities yet</h3>
            </article>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>My applications</h2>
        </div>

        <div className="cards-list">
          {applications.length ? (
            applications.map((application) => {
              const joinState = getJoinState(application, hasJoinedInternship);

              return (
                <article className="dashboard-card" key={application.id}>
                  <div className="card-topline">
                    <h3>{application.title}</h3>
                    <span className={`badge status-${application.status}`}>{application.status}</span>
                  </div>
                  <p>Company: {application.companyName}</p>
                  <p>Applied on: {formatDisplayDate(application.applicationDate)}</p>
                  {joinState ? <p>Join status: {joinState.statusText}</p> : null}
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
                  {joinState ? (
                    <button
                      className="primary-button"
                      disabled={joiningApplicationId === application.id || joinState.disabled}
                      onClick={() => handleJoin(application.id)}
                      type="button"
                    >
                      {joiningApplicationId === application.id ? "Joining..." : joinState.label}
                    </button>
                  ) : null}
                  {application.status === "pending" ? (
                    <button
                      className="secondary-button"
                      disabled={cancellingApplicationId === application.id}
                      onClick={() => handleCancelApplication(application.id)}
                      type="button"
                    >
                      {cancellingApplicationId === application.id ? "Cancelling..." : "Cancel application"}
                    </button>
                  ) : null}
                </article>
              );
            })
          ) : (
            <article className="dashboard-card">
              <h3>No applications yet</h3>
            </article>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Internship reports</h2>
          <p>Upload the report PDF only after you have joined your internship.</p>
        </div>

        <div className="cards-list">
          {joinedRecords.length ? (
            joinedRecords.map((record) => (
              <article className="dashboard-card" key={record.id}>
                <div className="card-topline">
                  <h3>Internship report</h3>
                  <span className={`badge status-${record.progressStatus}`}>{record.progressStatus}</span>
                </div>
                <p>Company: {record.companyName}</p>
                <p>
                  Report PDF:{" "}
                  {record.reportFile ? (
                    <a className="file-link" href={record.reportFile} target="_blank" rel="noreferrer">
                      Open latest uploaded PDF
                    </a>
                  ) : (
                    "No report uploaded yet"
                  )}
                </p>

                <label className="inline-label">
                  Report PDF
                  <input
                    accept="application/pdf,.pdf"
                    type="file"
                    onChange={(event) =>
                      setReportMap((current) => ({
                        ...current,
                        [record.id]: event.target.files?.[0] || null,
                      }))
                    }
                  />
                  <span className="field-help">PDF only. Maximum file size: 50 MB.</span>
                </label>

                <button
                  className="primary-button"
                  disabled={uploadingReportId === record.id}
                  onClick={() => handleReportSubmit(record.id)}
                  type="button"
                >
                  {uploadingReportId === record.id
                    ? "Uploading..."
                    : record.reportFile
                      ? "Replace report"
                      : "Submit report"}
                </button>
              </article>
            ))
          ) : (
            <article className="dashboard-card">
              <h3>No joined internship yet</h3>
              <p>After an approval, use the join button in My applications. Your report upload will appear here after that.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
