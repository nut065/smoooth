"use client";

import liff from "@line/liff";

let initPromise: Promise<void> | null = null;

export function getLiff() {
  return liff;
}

export function initLiff() {
  if (initPromise) return initPromise;
  const id = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!id) {
    initPromise = Promise.reject(new Error("NEXT_PUBLIC_LIFF_ID not set"));
    return initPromise;
  }
  initPromise = liff.init({ liffId: id });
  return initPromise;
}

export async function getProfile() {
  await initLiff();
  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }
  return liff.getProfile();
}
