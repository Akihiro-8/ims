import "server-only";

import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mysqlPool } from "@/utils/db";

const SESSION_COOKIE_NAME = "ims_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const DEFAULT_SECRET = "ims-development-secret-change-me";

export const roleLabels = {
  student: "Student",
  company: "Company",
  supervisor: "Academic Supervisor",
  admin: "University Administrator",
};

export const dashboardPaths = {
  student: "/student",
  company: "/company",
  supervisor: "/supervisor",
  admin: "/admin",
};

const validRoles = Object.keys(dashboardPaths);

function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || DEFAULT_SECRET;
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = storedPassword.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(computedHash, "hex"));
}

export function createSessionToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));

    if (!payload?.sub || !payload?.role || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getDashboardPath(role) {
  return dashboardPaths[role] || "/";
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  return getUserById(session.sub);
}

export async function requireRole(role) {
  const user = await getCurrentUser();

  if (!user || user.role !== role) {
    return null;
  }

  return user;
}

export function buildProfileData(role, profile = {}) {
  if (!validRoles.includes(role)) {
    throw new Error("Unsupported role selected.");
  }

  switch (role) {
    case "student":
      return {
        studentProfile: {
          create: {
            department: profile.department || null,
            major: profile.major || null,
            year: profile.year ? Number(profile.year) : null,
            phone: profile.phone || null,
          },
        },
      };
    case "company":
      return {
        companyProfile: {
          create: {
            companyName: profile.companyName?.trim() || "New Company",
            industry: profile.industry || null,
            location: profile.location || null,
            phone: profile.phone || null,
            contactPerson: profile.contactPerson || null,
          },
        },
      };
    case "supervisor":
      return {
        supervisorProfile: {
          create: {
            department: profile.department || null,
          },
        },
      };
    case "admin":
      return {};
    default:
      throw new Error("Unsupported role selected.");
  }
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    password: row.password,
    studentProfile: row.studentProfileId
      ? {
          id: row.studentProfileId,
          phone: row.studentPhone,
          department: row.studentDepartment,
          major: row.studentMajor,
          year: row.studentYear,
        }
      : null,
    companyProfile: row.companyProfileId
      ? {
          id: row.companyProfileId,
          companyName: row.companyName,
          industry: row.companyIndustry,
          location: row.companyLocation,
          phone: row.companyPhone,
          contactPerson: row.companyContactPerson,
        }
      : null,
    supervisorProfile: row.supervisorProfileId
      ? {
          id: row.supervisorProfileId,
          department: row.supervisorDepartment,
        }
      : null,
  };
}

async function getUserByField(fieldName, value) {
  const allowedFields = {
    id: "`User`.`id`",
    email: "`User`.`email`",
  };

  const field = allowedFields[fieldName];

  if (!field) {
    throw new Error("Unsupported lookup field.");
  }

  const promisePool = mysqlPool.promise();
  const [rows] = await promisePool.query(
    `
      SELECT
        \`User\`.\`id\`,
        \`User\`.\`name\`,
        \`User\`.\`email\`,
        \`User\`.\`password\`,
        \`User\`.\`role\`,
        \`StudentProfile\`.\`id\` AS studentProfileId,
        \`StudentProfile\`.\`phone\` AS studentPhone,
        \`StudentProfile\`.\`department\` AS studentDepartment,
        \`StudentProfile\`.\`major\` AS studentMajor,
        \`StudentProfile\`.\`year\` AS studentYear,
        \`CompanyProfile\`.\`id\` AS companyProfileId,
        \`CompanyProfile\`.\`companyName\` AS companyName,
        \`CompanyProfile\`.\`industry\` AS companyIndustry,
        \`CompanyProfile\`.\`location\` AS companyLocation,
        \`CompanyProfile\`.\`phone\` AS companyPhone,
        \`CompanyProfile\`.\`contactPerson\` AS companyContactPerson,
        \`SupervisorProfile\`.\`id\` AS supervisorProfileId,
        \`SupervisorProfile\`.\`department\` AS supervisorDepartment
      FROM \`User\`
      LEFT JOIN \`StudentProfile\` ON \`StudentProfile\`.\`userId\` = \`User\`.\`id\`
      LEFT JOIN \`CompanyProfile\` ON \`CompanyProfile\`.\`userId\` = \`User\`.\`id\`
      LEFT JOIN \`SupervisorProfile\` ON \`SupervisorProfile\`.\`userId\` = \`User\`.\`id\`
      WHERE ${field} = ?
      LIMIT 1
    `,
    [value]
  );

  return mapUserRow(rows[0]);
}

export async function getUserById(id) {
  return getUserByField("id", id);
}

export async function getUserByEmail(email) {
  return getUserByField("email", email);
}

export async function createUserWithProfile({ name, email, password, role, profile = {} }) {
  if (!validRoles.includes(role)) {
    throw new Error("Unsupported role selected.");
  }

  const connection = await mysqlPool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query(
      "INSERT INTO `User` (`name`, `email`, `password`, `role`) VALUES (?, ?, ?, ?)",
      [name, email, password, role]
    );

    const userId = userResult.insertId;

    if (role === "student") {
      await connection.query(
        "INSERT INTO `StudentProfile` (`userId`, `phone`, `department`, `major`, `year`) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          profile.phone || null,
          profile.department || null,
          profile.major || null,
          profile.year ? Number(profile.year) : null,
        ]
      );
    }

    if (role === "company") {
      await connection.query(
        "INSERT INTO `CompanyProfile` (`userId`, `companyName`, `industry`, `location`, `phone`, `contactPerson`) VALUES (?, ?, ?, ?, ?, ?)",
        [
          userId,
          profile.companyName?.trim() || "New Company",
          profile.industry || null,
          profile.location || null,
          profile.phone || null,
          profile.contactPerson || null,
        ]
      );
    }

    if (role === "supervisor") {
      await connection.query(
        "INSERT INTO `SupervisorProfile` (`userId`, `department`) VALUES (?, ?)",
        [userId, profile.department || null]
      );
    }

    await connection.commit();
    return getUserById(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function getSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}
