const TOKEN_KEY = "policysync_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Support VITE_API_URL prefix if specified (useful for separated frontend/backend deployments like Vercel)
  const apiBase = (import.meta as any).env?.VITE_API_URL || "";
  let fullUrl = endpoint;
  if (apiBase) {
    const cleanBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    fullUrl = `${cleanBase}${cleanEndpoint}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Safely parse JSON or handle HTML/Text error pages
  let data: any = null;
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  let responseText = "";
  try {
    responseText = await response.text();
  } catch (e) {
    // Ignore text reading error
  }

  if (isJson || (responseText.trim().startsWith("{") || responseText.trim().startsWith("["))) {
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message;
    
    // Check if trial has expired and bubble that up specifically
    if (response.status === 403 && data?.trialExpired) {
      throw {
        message: errorMsg || "Your free trial has expired.",
        trialExpired: true,
      };
    }

    if (!data) {
      // If we received an HTML response or static page (common 404/500 errors on static hosting)
      if (responseText.includes("<!DOCTYPE") || responseText.includes("<html") || responseText.startsWith("The page c")) {
        throw new Error(
          `API Server returned an HTML page (HTTP ${response.status}) instead of JSON. ` +
          `If you are deploying on a static platform like Vercel, please make sure your backend server is running ` +
          `separately and configure VITE_API_URL to point to it.`
        );
      }
      throw new Error(`HTTP Error ${response.status}: ${responseText || "Unknown Error"}`);
    }

    throw new Error(errorMsg || `An error occurred (HTTP ${response.status})`);
  }

  // If response is OK but not JSON (or we failed to parse it)
  if (data === null) {
    throw new Error("Server succeeded but returned a non-JSON response.");
  }

  return data as T;
}
