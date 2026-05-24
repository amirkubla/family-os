/**
 * http.ts — Thin fetch wrapper with base URL, timeout, typed JSON.
 *
 * Automatically injects Authorization: Bearer <jwt> from the stored
 * session for all requests except /v1/auth/* endpoints.
 */

import { loadSession } from "@src/auth/storage";
import { getApiBaseUrl } from "./baseUrl";

const BASE_URL = getApiBaseUrl();

const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}: ${JSON.stringify(body)}`);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Build headers — inject auth token for non-auth endpoints
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (!path.startsWith("/v1/auth/")) {
    try {
      const session = await loadSession();
      if (session?.token) {
        headers["Authorization"] = `Bearer ${session.token}`;
      }
    } catch {
      // Session load failed — proceed without token
    }
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => "Unknown error");
      }
      throw new ApiError(res.status, body);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const http = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
