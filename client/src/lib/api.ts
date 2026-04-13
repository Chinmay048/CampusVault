const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

type RequestOptions = RequestInit & { authToken?: string };

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type");
  
  let data: unknown = null;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
      message = data.message;
    } else if (!data) {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {
        // ignore fallback body parsing
      }
    }
    throw new Error(message);
  }
  return data as T;
}

