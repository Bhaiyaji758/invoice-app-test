export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://alitinvoiceappapi.azurewebsites.net/api";

export interface ApiError {
  status: number;
  message: string;
}

export interface AuthUser {
  userID: number;
  firstName: string;
  lastName?: string;
  email: string;
}

export interface AuthCompany {
  companyID: number;
  companyName: string;
  currencySymbol: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Something went wrong.";
    try {
      const data = await res.json();
      if (typeof data?.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore
    }

    const error: ApiError = { status: res.status, message };
    throw error;
  }
  return (await res.json()) as T;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("jwtToken") ??
    window.sessionStorage.getItem("jwtToken")
  );
}

export function setAuthToken(token: string, rememberMe: boolean) {
  if (typeof window === "undefined") return;
  if (rememberMe) {
    window.localStorage.setItem("jwtToken", token);
    window.sessionStorage.removeItem("jwtToken");
  } else {
    window.sessionStorage.setItem("jwtToken", token);
    window.localStorage.removeItem("jwtToken");
  }
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("jwtToken");
  window.sessionStorage.removeItem("jwtToken");
}

export function setAuthContext(
  token: string,
  user: AuthUser,
  company: AuthCompany,
  rememberMe: boolean
) {
  setAuthToken(token, rememberMe);
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ user, company });
  if (rememberMe) {
    window.localStorage.setItem("authContext", payload);
    window.sessionStorage.removeItem("authContext");
  } else {
    window.sessionStorage.setItem("authContext", payload);
    window.localStorage.removeItem("authContext");
  }
}

export function getAuthCompany(): AuthCompany | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem("authContext") ??
    window.sessionStorage.getItem("authContext");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { company?: AuthCompany };
    return parsed.company ?? null;
  } catch {
    return null;
  }
}

export async function apiGet<T>(path: string, withAuth = true): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  if (withAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(
  path: string,
  body: any,
  withAuth = true
): Promise<T> {
  const headers: HeadersInit = {
    "ngrok-skip-browser-warning": "true",
  };
  const isFormData = body instanceof FormData;

  // Send JSON content type for JSON payloads; let browser set multipart boundary for FormData.
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (withAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(
  path: string,
  body?: any,
  withAuth = true
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  if (withAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

