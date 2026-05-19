// @ts-nocheck
// dashboard/src/lib/api-client.ts
// Typed API client with interceptors, refresh token handling, and blob support

import { config } from "./config";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
}

class ApiClientError extends Error {
  status: number;
  detail?: unknown;

  constructor({ status, message, detail }: ApiError) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem("sentinel_access_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("sentinel_refresh_token");
}

function setTokens(access: string, refresh?: string): void {
  localStorage.setItem("sentinel_access_token", access);
  if (refresh) {
    localStorage.setItem("sentinel_refresh_token", refresh);
  }
}

function clearTokens(): void {
  localStorage.removeItem("sentinel_access_token");
  localStorage.removeItem("sentinel_refresh_token");
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = buildUrl(path, params);
  const init: RequestInit = {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  let response = await fetch(url, init);

  // Handle 401 with token refresh
  if (response.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAuthToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...init, headers });
    } else {
      clearTokens();
      window.location.href = "/login";
      throw new ApiClientError({ status: 401, message: "Session expired" });
    }
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new ApiClientError({
      status: response.status,
      message: `Request failed: ${response.statusText}`,
      detail,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { body, params, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = buildUrl(path, params);
  const init: RequestInit = {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  let response = await fetch(url, init);

  if (response.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAuthToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...init, headers });
    } else {
      clearTokens();
      window.location.href = "/login";
      throw new ApiClientError({ status: 401, message: "Session expired" });
    }
  }

  if (!response.ok) {
    throw new ApiClientError({
      status: response.status,
      message: `Blob request failed: ${response.statusText}`,
    });
  }

  return response.blob();
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return request<T>(path, { method: "GET", params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: "POST", body });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: "PUT", body });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: "PATCH", body });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },

  postBlob(path: string, body?: unknown): Promise<Blob> {
    return requestBlob(path, { method: "POST", body });
  },

  getBlob(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<Blob> {
    return requestBlob(path, { method: "GET", params });
  },
};

export { ApiClientError, getAuthToken, setTokens, clearTokens };
export type { ApiError };
