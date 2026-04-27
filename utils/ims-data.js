import "server-only";

import { mysqlPool } from "@/utils/db";

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export async function updateUserProfileByUserId(userId, role, profile) {
  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [emailRows] = await connection.query(
      "SELECT id FROM `User` WHERE email = ? AND id <> ? LIMIT 1",
      [profile.email, userId]
    );

    if (emailRows[0]) {
      throw new Error("That email is already being used by another account.");
    }

    await connection.query(
      "UPDATE `User` SET name = ?, email = ? WHERE id = ?",
      [profile.name, profile.email, userId]
    );

    if (role === "student") {
      await connection.query(
        `
          UPDATE StudentProfile
          SET phone = ?, department = ?, major = ?, year = ?
          WHERE userId = ?
        `,
        [
          profile.phone || null,
          profile.department || null,
          profile.major || null,
          profile.year ? Number(profile.year) : null,
          userId,
        ]
      );
    }

    if (role === "company") {
      const companyName = profile.companyName?.trim() || profile.name?.trim();

      await connection.query(
        `
          UPDATE CompanyProfile
          SET companyName = ?, industry = ?, location = ?, phone = ?, contactPerson = ?
          WHERE userId = ?
        `,
        [
          companyName,
          profile.industry || null,
          profile.location || null,
          profile.phone || null,
          profile.contactPerson || null,
          userId,
        ]
      );
    }

    if (role === "supervisor") {
      await connection.query(
        `
          UPDATE SupervisorProfile
          SET department = ?
          WHERE userId = ?
        `,
        [profile.department || null, userId]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listOpenInternshipOpportunities() {
  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(`
    SELECT
      InternshipOpportunity.id,
      InternshipOpportunity.title,
      InternshipOpportunity.description,
      InternshipOpportunity.requirements,
      InternshipOpportunity.startDate,
      InternshipOpportunity.endDate,
      InternshipOpportunity.availableSlots,
      CompanyProfile.companyName,
      CompanyProfile.industry,
      CompanyProfile.location,
      COUNT(
        CASE
          WHEN Application.status = 'approved' THEN 1
          ELSE NULL
        END
      ) AS approvedCount,
      COUNT(
        CASE
          WHEN InternshipRecord.progressStatus IN ('ongoing', 'completed') THEN 1
          ELSE NULL
        END
      ) AS joinedCount
    FROM InternshipOpportunity
    INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
    LEFT JOIN Application ON Application.internshipId = InternshipOpportunity.id
    LEFT JOIN InternshipRecord ON InternshipRecord.applicationId = Application.id
    WHERE InternshipOpportunity.endDate IS NULL OR DATE(InternshipOpportunity.endDate) >= CURDATE()
    GROUP BY
      InternshipOpportunity.id,
      InternshipOpportunity.title,
      InternshipOpportunity.description,
      InternshipOpportunity.requirements,
      InternshipOpportunity.startDate,
      InternshipOpportunity.endDate,
      InternshipOpportunity.availableSlots,
      CompanyProfile.companyName,
      CompanyProfile.industry,
      CompanyProfile.location
    ORDER BY InternshipOpportunity.id DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    startDate: normalizeDate(row.startDate),
    endDate: normalizeDate(row.endDate),
    availableSlots: row.availableSlots,
    companyName: row.companyName,
    industry: row.industry,
    location: row.location,
    approvedCount: Number(row.approvedCount || 0),
    joinedCount: Number(row.joinedCount || 0),
    isFull: Number(row.approvedCount || 0) >= Number(row.availableSlots || 0),
  }));
}

export async function listStudentApplicationsByUserId(userId) {
  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(
    `
      SELECT
        Application.id,
        Application.internshipId,
        Application.applicationDate,
        Application.status,
        Application.resumeFile,
        InternshipOpportunity.title,
        CompanyProfile.companyName,
        InternshipRecord.id AS internshipRecordId,
        InternshipRecord.progressStatus AS internshipProgressStatus
      FROM Application
      INNER JOIN StudentProfile ON StudentProfile.id = Application.studentId
      INNER JOIN InternshipOpportunity ON InternshipOpportunity.id = Application.internshipId
      INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
      LEFT JOIN InternshipRecord ON InternshipRecord.applicationId = Application.id
      WHERE StudentProfile.userId = ?
      ORDER BY Application.applicationDate DESC
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    internshipId: row.internshipId,
    applicationDate: normalizeDate(row.applicationDate),
    status: row.status,
    resumeFile: row.resumeFile,
    title: row.title,
    companyName: row.companyName,
    internshipRecordId: row.internshipRecordId,
    internshipProgressStatus: row.internshipProgressStatus,
  }));
}

export async function listStudentInternshipRecordsByUserId(userId) {
  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(
    `
      SELECT
        InternshipRecord.id,
        InternshipRecord.progressStatus,
        InternshipRecord.startDate,
        InternshipRecord.endDate,
        InternshipOpportunity.title,
        CompanyProfile.companyName,
        InternshipReport.id AS reportId,
        InternshipReport.reportFile,
        InternshipReport.submissionDate
      FROM InternshipRecord
      INNER JOIN Application ON Application.id = InternshipRecord.applicationId
      INNER JOIN StudentProfile ON StudentProfile.id = Application.studentId
      INNER JOIN InternshipOpportunity ON InternshipOpportunity.id = Application.internshipId
      INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
      LEFT JOIN InternshipReport ON InternshipReport.recordId = InternshipRecord.id
      WHERE StudentProfile.userId = ?
      ORDER BY InternshipRecord.id DESC
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    progressStatus: row.progressStatus,
    startDate: normalizeDate(row.startDate),
    endDate: normalizeDate(row.endDate),
    title: row.title,
    companyName: row.companyName,
    reportId: row.reportId,
    reportFile: row.reportFile,
    submissionDate: normalizeDate(row.submissionDate),
  }));
}

export async function listCompanyOpportunitiesByUserId(userId) {
  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(
    `
      SELECT
        InternshipOpportunity.id,
        InternshipOpportunity.title,
        InternshipOpportunity.description,
        InternshipOpportunity.requirements,
        InternshipOpportunity.availableSlots,
        InternshipOpportunity.startDate,
        InternshipOpportunity.endDate,
        COUNT(
          CASE
            WHEN Application.status = 'approved' THEN 1
            ELSE NULL
          END
        ) AS approvedCount,
        COUNT(
          CASE
            WHEN InternshipRecord.progressStatus IN ('ongoing', 'completed') THEN 1
            ELSE NULL
          END
        ) AS joinedCount
      FROM InternshipOpportunity
      INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
      LEFT JOIN Application ON Application.internshipId = InternshipOpportunity.id
      LEFT JOIN InternshipRecord ON InternshipRecord.applicationId = Application.id
      WHERE CompanyProfile.userId = ?
        AND (InternshipOpportunity.endDate IS NULL OR DATE(InternshipOpportunity.endDate) >= CURDATE())
      GROUP BY
        InternshipOpportunity.id,
        InternshipOpportunity.title,
        InternshipOpportunity.description,
        InternshipOpportunity.requirements,
        InternshipOpportunity.availableSlots,
        InternshipOpportunity.startDate,
        InternshipOpportunity.endDate
      ORDER BY InternshipOpportunity.id DESC
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    availableSlots: row.availableSlots,
    startDate: normalizeDate(row.startDate),
    endDate: normalizeDate(row.endDate),
    approvedCount: Number(row.approvedCount || 0),
    joinedCount: Number(row.joinedCount || 0),
    isFull: Number(row.approvedCount || 0) >= Number(row.availableSlots || 0),
  }));
}

export async function listCompanyApplicationsByUserId(userId) {
  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(
    `
      SELECT
        Application.id,
        Application.applicationDate,
        Application.status,
        Application.resumeFile,
        InternshipOpportunity.id AS internshipId,
        InternshipOpportunity.title,
        InternshipOpportunity.availableSlots,
        \`User\`.name AS studentName,
        \`User\`.email AS studentEmail,
        StudentProfile.department,
        StudentProfile.major,
        StudentProfile.year,
        InternshipRecord.id AS internshipRecordId
      FROM Application
      INNER JOIN InternshipOpportunity ON InternshipOpportunity.id = Application.internshipId
      INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
      INNER JOIN StudentProfile ON StudentProfile.id = Application.studentId
      INNER JOIN \`User\` ON \`User\`.id = StudentProfile.userId
      LEFT JOIN InternshipRecord ON InternshipRecord.applicationId = Application.id
      WHERE CompanyProfile.userId = ?
      ORDER BY Application.applicationDate DESC
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    applicationDate: normalizeDate(row.applicationDate),
    status: row.status,
    resumeFile: row.resumeFile,
    internshipId: row.internshipId,
    title: row.title,
    availableSlots: row.availableSlots,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    department: row.department,
    major: row.major,
    year: row.year,
    internshipRecordId: row.internshipRecordId,
  }));
}

export async function updateStudentProfileByUserId(userId, profile) {
  const promisePool = mysqlPool.promise();
  await promisePool.query(
    `
      UPDATE StudentProfile
      SET
        phone = ?,
        department = ?,
        major = ?,
        year = ?
      WHERE userId = ?
    `,
    [
      profile.phone || null,
      profile.department || null,
      profile.major || null,
      profile.year ? Number(profile.year) : null,
      userId,
    ]
  );
}

export async function createStudentApplication({ userId, internshipId, resumeFile }) {
  const promisePool = mysqlPool.promise();

  const [studentRows] = await promisePool.query(
    "SELECT id FROM StudentProfile WHERE userId = ? LIMIT 1",
    [userId]
  );

  const studentProfile = studentRows[0];

  if (!studentProfile) {
    throw new Error("Student profile not found.");
  }

  const [internshipRows] = await promisePool.query(
    `
      SELECT
        InternshipOpportunity.id,
        InternshipOpportunity.availableSlots,
        COUNT(
          CASE
            WHEN Application.status = 'approved' THEN 1
            ELSE NULL
          END
        ) AS approvedCount
      FROM InternshipOpportunity
      LEFT JOIN Application ON Application.internshipId = InternshipOpportunity.id
      WHERE InternshipOpportunity.id = ?
      GROUP BY InternshipOpportunity.id, InternshipOpportunity.availableSlots
      LIMIT 1
    `,
    [internshipId]
  );

  const internship = internshipRows[0];

  if (!internship) {
    throw new Error("Internship opportunity not found.");
  }

  if (Number(internship.approvedCount || 0) >= Number(internship.availableSlots || 0)) {
    throw new Error("This internship is already full.");
  }

  const [existingRows] = await promisePool.query(
    `
      SELECT id
      FROM Application
      WHERE studentId = ? AND internshipId = ?
      LIMIT 1
    `,
    [studentProfile.id, internshipId]
  );

  if (existingRows[0]) {
    throw new Error("You already applied to this internship.");
  }

  await promisePool.query(
    `
      INSERT INTO Application (studentId, internshipId, applicationDate, status, resumeFile)
      VALUES (?, ?, NOW(), 'pending', ?)
    `,
    [studentProfile.id, internshipId, resumeFile || null]
  );
}

export async function joinApprovedInternshipByUserId(userId, applicationId) {
  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [studentRows] = await connection.query(
      "SELECT id FROM StudentProfile WHERE userId = ? LIMIT 1",
      [userId]
    );

    const studentProfile = studentRows[0];

    if (!studentProfile) {
      throw new Error("Student profile not found.");
    }

    const [applicationRows] = await connection.query(
      `
        SELECT
          Application.id,
          Application.status,
          InternshipRecord.id AS internshipRecordId,
          InternshipRecord.progressStatus
        FROM Application
        LEFT JOIN InternshipRecord ON InternshipRecord.applicationId = Application.id
        WHERE Application.id = ? AND Application.studentId = ?
        LIMIT 1
      `,
      [applicationId, studentProfile.id]
    );

    const application = applicationRows[0];

    if (!application) {
      throw new Error("Approved internship application not found.");
    }

    if (application.status !== "approved") {
      throw new Error("Only approved applications can be joined.");
    }

    if (!application.internshipRecordId) {
      throw new Error("Internship record is not ready yet.");
    }

    if (application.progressStatus === "ongoing" || application.progressStatus === "completed") {
      throw new Error("This internship has already been joined.");
    }

    const [joinedRows] = await connection.query(
      `
        SELECT InternshipRecord.id
        FROM InternshipRecord
        INNER JOIN Application ON Application.id = InternshipRecord.applicationId
        WHERE Application.studentId = ?
          AND InternshipRecord.id <> ?
          AND InternshipRecord.progressStatus IN ('ongoing', 'completed')
        LIMIT 1
      `,
      [studentProfile.id, application.internshipRecordId]
    );

    if (joinedRows[0]) {
      throw new Error("You can only join one internship.");
    }

    await connection.query(
      `
        UPDATE InternshipRecord
        SET progressStatus = 'ongoing'
        WHERE id = ?
      `,
      [application.internshipRecordId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createCompanyOpportunityByUserId(userId, opportunity) {
  const promisePool = mysqlPool.promise();
  const [companyRows] = await promisePool.query(
    "SELECT id FROM CompanyProfile WHERE userId = ? LIMIT 1",
    [userId]
  );

  const companyProfile = companyRows[0];

  if (!companyProfile) {
    throw new Error("Company profile not found.");
  }

  await promisePool.query(
    `
      INSERT INTO InternshipOpportunity
      (companyId, title, description, requirements, startDate, endDate, availableSlots)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      companyProfile.id,
      opportunity.title,
      opportunity.description || null,
      opportunity.requirements || null,
      opportunity.startDate || null,
      opportunity.endDate || null,
      Number(opportunity.availableSlots),
    ]
  );
}

export async function removeCompanyOpportunityByUserId(userId, opportunityId) {
  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [opportunityRows] = await connection.query(
      `
        SELECT
          InternshipOpportunity.id,
          InternshipOpportunity.availableSlots,
          COUNT(
            CASE
              WHEN Application.status = 'approved' THEN 1
              ELSE NULL
            END
          ) AS approvedCount,
          COUNT(Application.id) AS applicationCount
        FROM InternshipOpportunity
        INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
        LEFT JOIN Application ON Application.internshipId = InternshipOpportunity.id
        WHERE InternshipOpportunity.id = ? AND CompanyProfile.userId = ?
        GROUP BY InternshipOpportunity.id, InternshipOpportunity.availableSlots
        LIMIT 1
      `,
      [opportunityId, userId]
    );

    const opportunity = opportunityRows[0];

    if (!opportunity) {
      throw new Error("Opportunity not found for this company.");
    }

    if (Number(opportunity.approvedCount || 0) < Number(opportunity.availableSlots || 0)) {
      throw new Error("Only full opportunities can be removed.");
    }

    await connection.query(
      `
        UPDATE InternshipOpportunity
        SET endDate = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        WHERE id = ?
      `,
      [opportunityId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelStudentApplicationByUserId(userId, applicationId) {
  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [studentRows] = await connection.query(
      "SELECT id FROM StudentProfile WHERE userId = ? LIMIT 1",
      [userId]
    );

    const studentProfile = studentRows[0];

    if (!studentProfile) {
      throw new Error("Student profile not found.");
    }

    const [applicationRows] = await connection.query(
      `
        SELECT
          Application.id,
          Application.status,
          InternshipRecord.id AS internshipRecordId
        FROM Application
        LEFT JOIN InternshipRecord ON InternshipRecord.applicationId = Application.id
        WHERE Application.id = ? AND Application.studentId = ?
        LIMIT 1
      `,
      [applicationId, studentProfile.id]
    );

    const application = applicationRows[0];

    if (!application) {
      throw new Error("Application not found.");
    }

    if (application.status !== "pending") {
      throw new Error("Only pending applications can be cancelled.");
    }

    if (application.internshipRecordId) {
      throw new Error("This application is already linked to an internship record.");
    }

    await connection.query("DELETE FROM Application WHERE id = ?", [applicationId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCompanyApplicationStatusByUserId(userId, applicationId, status) {
  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Unsupported decision.");
  }

  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [applicationRows] = await connection.query(
      `
        SELECT
          Application.id,
          Application.status,
          Application.internshipId,
          InternshipOpportunity.availableSlots,
          InternshipRecord.id AS internshipRecordId
        FROM Application
        INNER JOIN InternshipOpportunity ON InternshipOpportunity.id = Application.internshipId
        INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
        LEFT JOIN InternshipRecord ON InternshipRecord.applicationId = Application.id
        WHERE Application.id = ? AND CompanyProfile.userId = ?
        LIMIT 1
      `,
      [applicationId, userId]
    );

    const application = applicationRows[0];

    if (!application) {
      throw new Error("Application not found for this company.");
    }

    if (application.status === status) {
      await connection.commit();
      return;
    }

    if (application.status !== "pending") {
      throw new Error("This application decision is already final.");
    }

    if (status === "approved") {
      const [targetStudentRows] = await connection.query(
        "SELECT studentId FROM Application WHERE id = ? LIMIT 1",
        [applicationId]
      );

      const targetStudentId = targetStudentRows[0]?.studentId;

      if (!targetStudentId) {
        throw new Error("Student application could not be verified.");
      }

      const [studentApprovedRows] = await connection.query(
        `
          SELECT Application.id
          FROM Application
          WHERE Application.studentId = ?
            AND Application.id <> ?
            AND Application.status = 'approved'
          LIMIT 1
        `,
        [targetStudentId, applicationId]
      );

      if (studentApprovedRows[0]) {
        throw new Error("This student already has an approved internship application.");
      }

      const [approvedRows] = await connection.query(
        `
          SELECT COUNT(*) AS approvedCount
          FROM Application
          WHERE internshipId = ?
            AND status = 'approved'
            AND id <> ?
        `,
        [application.internshipId, applicationId]
      );

      if (approvedRows[0].approvedCount >= application.availableSlots) {
        throw new Error("No approval slots remain for this internship.");
      }
    }

    await connection.query("UPDATE Application SET status = ? WHERE id = ?", [status, applicationId]);

    if (status === "approved" && !application.internshipRecordId) {
      await connection.query(
        `
          INSERT INTO InternshipRecord (applicationId, startDate, endDate, progressStatus)
          VALUES (?, NULL, NULL, 'awaiting_join')
        `,
        [applicationId]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listSupervisorEvaluationTargetsByUserId(userId) {
  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(
    `
      SELECT
        InternshipRecord.id,
        InternshipRecord.progressStatus,
        InternshipRecord.startDate,
        InternshipRecord.endDate,
        InternshipOpportunity.title,
        CompanyProfile.companyName,
        \`User\`.name AS studentName,
        \`User\`.email AS studentEmail,
        StudentProfile.department,
        StudentProfile.major,
        StudentProfile.year,
        Evaluation.id AS evaluationId,
        Evaluation.score,
        Evaluation.feedback,
        Evaluation.evaluationDate,
        InternshipReport.reportFile,
        InternshipReport.submissionDate
      FROM InternshipRecord
      INNER JOIN Application ON Application.id = InternshipRecord.applicationId
      INNER JOIN InternshipOpportunity ON InternshipOpportunity.id = Application.internshipId
      INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
      INNER JOIN StudentProfile ON StudentProfile.id = Application.studentId
      INNER JOIN \`User\` ON \`User\`.id = StudentProfile.userId
      INNER JOIN SupervisorProfile ON SupervisorProfile.userId = ?
      LEFT JOIN Evaluation
        ON Evaluation.recordId = InternshipRecord.id
       AND Evaluation.supervisorId = SupervisorProfile.id
      LEFT JOIN InternshipReport ON InternshipReport.recordId = InternshipRecord.id
      WHERE Application.status = 'approved'
        AND InternshipRecord.progressStatus IN ('ongoing', 'completed', 'terminated')
        AND NOT (
          InternshipRecord.progressStatus = 'completed'
          AND Evaluation.id IS NULL
          AND EXISTS (
            SELECT 1
            FROM Evaluation AS OtherEvaluation
            WHERE OtherEvaluation.recordId = InternshipRecord.id
              AND OtherEvaluation.supervisorId <> SupervisorProfile.id
          )
        )
      ORDER BY InternshipRecord.id DESC
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    progressStatus: row.progressStatus,
    startDate: normalizeDate(row.startDate),
    endDate: normalizeDate(row.endDate),
    title: row.title,
    companyName: row.companyName,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    department: row.department,
    major: row.major,
    year: row.year,
    evaluationId: row.evaluationId,
    score: row.score,
    feedback: row.feedback,
    evaluationDate: normalizeDate(row.evaluationDate),
    reportFile: row.reportFile,
    submissionDate: normalizeDate(row.submissionDate),
  }));
}

export async function saveSupervisorEvaluationByUserId(userId, recordId, evaluation) {
  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [supervisorRows] = await connection.query(
      "SELECT id FROM SupervisorProfile WHERE userId = ? LIMIT 1",
      [userId]
    );

    const supervisorProfile = supervisorRows[0];

    if (!supervisorProfile) {
      throw new Error("Supervisor profile not found.");
    }

    const [recordRows] = await connection.query(
      `
        SELECT
          InternshipRecord.id,
          InternshipRecord.progressStatus,
          (
            SELECT id
            FROM Evaluation
            WHERE recordId = InternshipRecord.id
              AND supervisorId = ?
            LIMIT 1
          ) AS currentSupervisorEvaluationId,
          EXISTS (
            SELECT 1
            FROM Evaluation AS OtherEvaluation
            WHERE OtherEvaluation.recordId = InternshipRecord.id
              AND OtherEvaluation.supervisorId <> ?
          ) AS hasOtherSupervisorEvaluation
        FROM InternshipRecord
        INNER JOIN Application ON Application.id = InternshipRecord.applicationId
        WHERE InternshipRecord.id = ? AND Application.status = 'approved'
        LIMIT 1
      `,
      [supervisorProfile.id, supervisorProfile.id, recordId]
    );

    const record = recordRows[0];

    if (!record) {
      throw new Error("Approved internship record not found.");
    }

    if (
      record.progressStatus === "completed" &&
      !record.currentSupervisorEvaluationId &&
      Number(record.hasOtherSupervisorEvaluation)
    ) {
      throw new Error("This completed evaluation is already handled by another supervisor.");
    }

    const [existingRows] = await connection.query(
      "SELECT id FROM Evaluation WHERE recordId = ? AND supervisorId = ? LIMIT 1",
      [recordId, supervisorProfile.id]
    );

    await connection.query(
      `
        UPDATE InternshipRecord
        SET progressStatus = ?, startDate = ?, endDate = ?
        WHERE id = ?
      `,
      [
        evaluation.progressStatus,
        evaluation.startDate || null,
        evaluation.endDate || null,
        recordId,
      ]
    );

    if (existingRows[0]) {
      await connection.query(
        `
          UPDATE Evaluation
          SET score = ?, feedback = ?, evaluationDate = NOW()
          WHERE id = ?
        `,
        [Number(evaluation.score), evaluation.feedback || null, existingRows[0].id]
      );
    } else {
      await connection.query(
        `
          INSERT INTO Evaluation (recordId, supervisorId, score, feedback, evaluationDate)
          VALUES (?, ?, ?, ?, NOW())
        `,
        [recordId, supervisorProfile.id, Number(evaluation.score), evaluation.feedback || null]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveStudentInternshipReportByUserId(userId, recordId, reportFile) {
  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [recordRows] = await connection.query(
      `
        SELECT
          InternshipRecord.id,
          InternshipRecord.progressStatus,
          InternshipReport.id AS reportId
        FROM InternshipRecord
        INNER JOIN Application ON Application.id = InternshipRecord.applicationId
        INNER JOIN StudentProfile ON StudentProfile.id = Application.studentId
        LEFT JOIN InternshipReport ON InternshipReport.recordId = InternshipRecord.id
        WHERE InternshipRecord.id = ? AND StudentProfile.userId = ?
        LIMIT 1
      `,
      [recordId, userId]
    );

    const record = recordRows[0];

    if (!record) {
      throw new Error("Internship record not found for this student.");
    }

    if (!["ongoing", "completed"].includes(record.progressStatus)) {
      throw new Error("Join the approved internship before submitting a report.");
    }

    if (record.reportId) {
      await connection.query(
        `
          UPDATE InternshipReport
          SET reportFile = ?, submissionDate = NOW()
          WHERE id = ?
        `,
        [reportFile, record.reportId]
      );
    } else {
      await connection.query(
        `
          INSERT INTO InternshipReport (recordId, reportFile, submissionDate)
          VALUES (?, ?, NOW())
        `,
        [recordId, reportFile]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getAdminReportSummary() {
  const promisePool = mysqlPool.promise();
  const [[counts]] = await promisePool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM \`User\`) AS totalUsers,
        (SELECT COUNT(*) FROM InternshipOpportunity) AS totalOpportunities,
        (SELECT COUNT(*) FROM Application) AS totalApplications,
        (SELECT COUNT(*) FROM Application WHERE status = 'approved') AS approvedApplications,
        (SELECT COUNT(*) FROM Application WHERE status = 'pending') AS pendingApplications,
        (SELECT COUNT(*) FROM Application WHERE status = 'rejected') AS rejectedApplications,
        (SELECT COUNT(*) FROM InternshipRecord) AS totalRecords,
        (SELECT COUNT(*) FROM Evaluation) AS totalEvaluations,
        (SELECT ROUND(AVG(score), 2) FROM Evaluation) AS averageEvaluationScore
    `
  );

  return {
    totalUsers: counts.totalUsers,
    totalOpportunities: counts.totalOpportunities,
    totalApplications: counts.totalApplications,
    approvedApplications: counts.approvedApplications,
    pendingApplications: counts.pendingApplications,
    rejectedApplications: counts.rejectedApplications,
    totalRecords: counts.totalRecords,
    totalEvaluations: counts.totalEvaluations,
    averageEvaluationScore: counts.averageEvaluationScore,
  };
}

export async function listAdminInternshipReports() {
  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(
    `
      SELECT
        InternshipRecord.id,
        InternshipRecord.progressStatus,
        InternshipRecord.startDate,
        InternshipRecord.endDate,
        InternshipOpportunity.title,
        CompanyProfile.companyName,
        StudentUser.name AS studentName,
        StudentUser.email AS studentEmail,
        StudentProfile.department,
        StudentProfile.major,
        StudentProfile.year,
        Application.applicationDate,
        Application.status AS applicationStatus,
        Evaluation.score,
        Evaluation.feedback,
        Evaluation.evaluationDate,
        SupervisorUser.name AS supervisorName,
        InternshipReport.reportFile,
        InternshipReport.submissionDate
      FROM InternshipRecord
      INNER JOIN Application ON Application.id = InternshipRecord.applicationId
      INNER JOIN InternshipOpportunity ON InternshipOpportunity.id = Application.internshipId
      INNER JOIN CompanyProfile ON CompanyProfile.id = InternshipOpportunity.companyId
      INNER JOIN StudentProfile ON StudentProfile.id = Application.studentId
      INNER JOIN \`User\` AS StudentUser ON StudentUser.id = StudentProfile.userId
      LEFT JOIN Evaluation ON Evaluation.recordId = InternshipRecord.id
      LEFT JOIN SupervisorProfile ON SupervisorProfile.id = Evaluation.supervisorId
      LEFT JOIN \`User\` AS SupervisorUser ON SupervisorUser.id = SupervisorProfile.userId
      LEFT JOIN InternshipReport ON InternshipReport.recordId = InternshipRecord.id
      ORDER BY InternshipRecord.id DESC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    progressStatus: row.progressStatus,
    startDate: normalizeDate(row.startDate),
    endDate: normalizeDate(row.endDate),
    title: row.title,
    companyName: row.companyName,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    department: row.department,
    major: row.major,
    year: row.year,
    applicationDate: normalizeDate(row.applicationDate),
    applicationStatus: row.applicationStatus,
    score: row.score,
    feedback: row.feedback,
    evaluationDate: normalizeDate(row.evaluationDate),
    supervisorName: row.supervisorName,
    reportFile: row.reportFile,
    submissionDate: normalizeDate(row.submissionDate),
  }));
}
