"use client";

import { useEffect } from "react";

// Marks the site owner in analytics so self-test traffic can be excluded. Rendered only for signed-in admins.
export function OwnerIdentify({ email }: { email: string }) {
  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      if (window.fw || ++tries > 20) {
        clearInterval(t);
        try {
          window.fw?.("identify", { userRef: "site-owner", email });
        } catch {
          // analytics must never break the admin page
        }
      }
    }, 500);
    return () => clearInterval(t);
  }, [email]);
  return null;
}
