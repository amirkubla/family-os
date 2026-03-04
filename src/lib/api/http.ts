/**
 * http.ts — Thin fetch wrapper with base URL, timeout, typed JSON.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

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

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
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
