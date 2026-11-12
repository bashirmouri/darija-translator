// Shared by the side panel and the options page: settings storage and calls to the REST API.

export const DEFAULT_SETTINGS = {
  serverUrl: "http://localhost:9080",
  username: "",
  password: "",
  defaultScript: "arabic", // "arabic" | "latin"
};

const TIMEOUT_MS = 40_000; // a little longer than the server's own 30 s LLM timeout

export async function loadSettings() {
  return chrome.storage.local.get(DEFAULT_SETTINGS);
}

export async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

/** An error with a message that can be shown to the user as-is. status is 0 for network problems. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** GET /api/health (no authentication). Resolves to { status, provider }. */
export async function health(settings) {
  const response = await send(settings, "/api/health", { method: "GET" });
  if (!response.ok) {
    throw await errorFrom(response, settings);
  }
  return response.json();
}

/** POST /api/translate. Resolves to { translation, provider }. */
export async function translate(settings, text, script) {
  const response = await send(settings, "/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(settings.username, settings.password),
    },
    body: JSON.stringify({ text, script }),
  });
  if (!response.ok) {
    throw await errorFrom(response, settings);
  }
  return response.json();
}

/**
 * Checks the username and password without spending an LLM call: a request with blank text
 * is rejected with 400 by the resource, which only runs after authentication succeeded.
 */
export async function checkCredentials(settings) {
  const response = await send(settings, "/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(settings.username, settings.password),
    },
    body: JSON.stringify({ text: "" }),
  });
  if (response.status !== 400) {
    throw await errorFrom(response, settings);
  }
}

function basicAuth(username, password) {
  // btoa only accepts Latin-1, so encode as UTF-8 first (passwords may contain any character).
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `Basic ${btoa(binary)}`;
}

async function send(settings, path, options) {
  const url = settings.serverUrl.trim().replace(/\/+$/, "") + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // credentials: "omit" stops Chrome from showing its own login pop-up on a 401;
    // we send the Authorization header ourselves.
    return await fetch(url, { ...options, credentials: "omit", signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError("The server took too long to answer. Try again.", 0);
    }
    throw new ApiError(
      `Server not reachable at ${settings.serverUrl}. Check that it is running and that the URL is right` +
        " (a URL other than localhost:9080 must also be listed in host_permissions in manifest.json).",
      0
    );
  } finally {
    clearTimeout(timer);
  }
}

async function errorFrom(response, settings) {
  let serverMessage = "";
  try {
    serverMessage = (await response.json()).error ?? "";
  } catch {
    // 401 has an empty body; some proxies answer with HTML.
  }

  switch (response.status) {
    case 400:
      return new ApiError(serverMessage || "The server rejected the request.", 400);
    case 401:
      return new ApiError("Wrong username or password. Check them in the extension options.", 401);
    case 404:
      return new ApiError(`No translation API at ${settings.serverUrl}. Check the server URL in the options.`, 404);
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
