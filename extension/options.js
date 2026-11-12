import { loadSettings, saveSettings, health, checkCredentials } from "./api.js";

const form = document.getElementById("settings-form");
const serverUrlInput = document.getElementById("server-url");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const scriptSelect = document.getElementById("default-script");
const testButton = document.getElementById("test-button");
const message = document.getElementById("message");
const checks = document.getElementById("checks");

init();

async function init() {
  const settings = await loadSettings();
  serverUrlInput.value = settings.serverUrl;
  usernameInput.value = settings.username;
  passwordInput.value = settings.password;
  scriptSelect.value = settings.defaultScript;
}

function settingsFromForm() {
  return {
    serverUrl: serverUrlInput.value.trim(),
    username: usernameInput.value.trim(),
    password: passwordInput.value,
    defaultScript: scriptSelect.value,
  };
}

/** Returns an error message, or "" when the form is usable. */
function validate(settings) {
  try {
    const url = new URL(settings.serverUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "The server URL must start with http:// or https://.";
    }
  } catch {
    return "Enter a valid server URL, e.g. http://localhost:9080.";
  }
  if (!settings.username || !settings.password) {
    return "Enter the username and password configured on the server (APP_USERNAME / APP_PASSWORD).";
  }
  return "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const settings = settingsFromForm();
  const problem = validate(settings);
  if (problem) {
    show(problem, "error");
    return;
  }
  await saveSettings(settings);
  show("Settings saved.", "ok");
});

// Tests what is in the form (saved or not), so settings can be checked before saving.
testButton.addEventListener("click", async () => {
  const settings = settingsFromForm();
  const problem = validate(settings);
  checks.replaceChildren();
  if (problem) {
    show(problem, "error");
    return;
  }

  testButton.disabled = true;
  show("Testing…", "info");
  try {
    const status = await health(settings);
    addCheck(`✔ Server reachable (LLM provider: ${status.provider})`);
    await checkCredentials(settings);
    addCheck("✔ Username and password accepted");
    show("Connection OK. Don't forget to save.", "ok");
  } catch (error) {
    show(error.message, "error");
  } finally {
    testButton.disabled = false;
  }
});

function addCheck(text) {
  const item = document.createElement("li");
  item.textContent = text;
  checks.append(item);
}

function show(text, kind) {
  message.textContent = text;
  message.className = `message ${kind}`;
}
