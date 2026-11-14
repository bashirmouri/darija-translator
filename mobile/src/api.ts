// Calls to the Darija Translator REST API, with one user-facing message per error.

export type Script = "arabic" | "latin";

export interface Settings {
  apiUrl: string;
  username: string;
  password: string;
}

/** An error whose message can be shown to the user as-is. status is 0 for network problems. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const TIMEOUT_MS = 40_000; // a little longer than the server's own 30 s LLM timeout

export async function health(settings: Settings): Promise<{ status: string; provider: string }> {
  const response = await send(settings, "/api/health", { method: "GET" });
  if (!response.ok) {
    throw await errorFrom(response, settings);
  }
  return response.json();
}

export async function translate(settings: Settings, text: string, script: Script): Promise<string> {
  const response = await send(settings, "/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: basicAuth(settings) },
    body: JSON.stringify({ text, script }),
  });
  if (!response.ok) {
    throw await errorFrom(response, settings);
  }
  const body = await response.json();
  return body.translation;
}

/** Checks the credentials without an LLM call: blank text gets 400 only after authentication succeeded. */
export async function checkCredentials(settings: Settings): Promise<void> {
  const response = await send(settings, "/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: basicAuth(settings) },
    body: JSON.stringify({ text: "" }),
  });
  if (response.status !== 400) {
    throw await errorFrom(response, settings);
  }
}

function basicAuth({ username, password }: Settings): string {
  // btoa only accepts Latin-1 characters, so encode as UTF-8 first.
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return `Basic ${btoa(binary)}`;
}

async function send(settings: Settings, path: string, init: RequestInit): Promise<Response> {
  const url = settings.apiUrl.trim().replace(/\/+$/, "") + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ApiError("The server took too long to answer. Try again.", 0);
    }
    throw new ApiError(
      `Server not reachable at ${settings.apiUrl}. Check that the server is running, the phone is on the ` +
        "same Wi-Fi as the PC, and the URL uses the PC's IP address (not localhost).",
      0
    );
  } finally {
    clearTimeout(timer);
  }
}

async function errorFrom(response: Response, settings: Settings): Promise<ApiError> {
  let serverMessage = "";
  try {
    serverMessage = (await response.json()).error ?? "";
  } catch {
    // 401 has an empty body
  }

  switch (response.status) {
    case 400:
      return new ApiError(serverMessage || "The server rejected the request.", 400);
    case 401:
      return new ApiError("Wrong username or password. Check them in Settings.", 401);
    case 404:
      return new ApiError(`No translation API at ${settings.apiUrl}. Check the server URL in Settings.`, 404);
    case 429:
      return new ApiError("The translation service is busy (rate limit). Wait a moment and try again.", 429);
    case 502:
      return new ApiError(
        `${serverMessage || "The translation model is unavailable right now."} Try again in a moment.`,
        502
      );
    default:
      return new ApiError(serverMessage || `Unexpected server response (HTTP ${response.status}).`, response.status);
  }
}
