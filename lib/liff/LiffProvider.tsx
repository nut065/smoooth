"use client";

import { useEffect, useState } from "react";
import { initLiff } from "./index";

// Mounts LIFF once on the client. Outside LINE webview the init promise can
// reject — children still render so the dev experience in Chrome works.
export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [, setReady] = useState(false);

  useEffect(() => {
    initLiff()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  return <>{children}</>;
}
