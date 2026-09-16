"use client";

// Silent refresh: wrap any authenticated client-side fetch with this. On a
// 401 (expired access token), it calls /api/auth/refresh once and retries
// the original request. If the refresh also fails, the caller's 401
// propagates as normal (the page-level guards then redirect to /login).
let pendingRefresh: Promise<Response> | null = null;

export async function fetchWithSilentRefresh(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const first = await fetch(input, init);
  if (first.status !== 401) return first;

  pendingRefresh ??= fetch("/api/auth/refresh", { method: "POST" }).finally(() => { pendingRefresh = null; });
  const refreshed = await pendingRefresh;
  if (!refreshed.ok) return first;

  return fetch(input, init);
}
