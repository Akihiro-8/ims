"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "logout",
        }),
      });
    } finally {
      router.push("/");
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button className="secondary-button" onClick={handleLogout} type="button">
      {isSubmitting ? "Signing out..." : "Sign out"}
    </button>
  );
}
