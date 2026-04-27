"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const initialLogin = {
  email: "",
  password: "",
};

const initialRegister = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
  department: "",
  major: "",
  year: "",
  companyName: "",
  industry: "",
  location: "",
};

export default function AuthHome() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(action, payload) {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setMessage(data.message);
      router.push(data.redirectTo);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    submit("login", loginForm);
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match.");
      setMessage("");
      return;
    }

    submit("register", registerForm);
  }

  const selectedRole = registerForm.role;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-toggle">
          <button
            className={mode === "login" ? "toggle-button active" : "toggle-button"}
            onClick={() => setMode("login")}
            suppressHydrationWarning
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "register" ? "toggle-button active" : "toggle-button"}
            onClick={() => setMode("register")}
            suppressHydrationWarning
            type="button"
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <h2>Welcome back</h2>
            <label>
              Email
              <input
                type="email"
                suppressHydrationWarning
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                suppressHydrationWarning
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
            </label>
            <button className="primary-button" disabled={isSubmitting} suppressHydrationWarning type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <h2>Create an account</h2>
            {selectedRole !== "company" ? (
              <label>
                Full name
                <input
                  type="text"
                  suppressHydrationWarning
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                type="email"
                suppressHydrationWarning
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                suppressHydrationWarning
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, password: event.target.value }))
                }
                minLength={8}
                required
              />
            </label>
            <label>
              Retype password
              <input
                type="password"
                suppressHydrationWarning
                value={registerForm.confirmPassword}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                minLength={8}
                required
              />
            </label>
            <label>
              Role
              <select
                suppressHydrationWarning
                value={registerForm.role}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                <option value="student">Student</option>
                <option value="company">Company</option>
                <option value="supervisor">Academic Supervisor</option>
                <option value="admin">University Administrator</option>
              </select>
            </label>

            {selectedRole === "student" && (
              <>
                <label>
                  Department
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={registerForm.department}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        department: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Major
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={registerForm.major}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, major: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Year
                  <input
                    type="number"
                    suppressHydrationWarning
                    value={registerForm.year}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, year: event.target.value }))
                    }
                  />
                </label>
              </>
            )}

            {selectedRole === "company" && (
              <>
                <label>
                  Company name
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={registerForm.companyName}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        name: event.target.value,
                        companyName: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Industry
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={registerForm.industry}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        industry: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Location
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={registerForm.location}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                  />
                </label>
              </>
            )}

            {selectedRole === "supervisor" && (
              <label>
                Department
                <input
                  type="text"
                  suppressHydrationWarning
                  value={registerForm.department}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      department: event.target.value,
                    }))
                  }
                />
              </label>
            )}

            <button className="primary-button" disabled={isSubmitting} suppressHydrationWarning type="submit">
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        {message ? <p className="status-message success">{message}</p> : null}
        {error ? <p className="status-message error">{error}</p> : null}
      </section>
    </main>
  );
}
