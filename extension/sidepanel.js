import { loadSettings, translate } from "./api.js";
import { speak, stopSpeaking, isSpeaking } from "./speech.js";

const MAX_LENGTH = 5000; // same limit as the server

const sourceText = document.getElementById("source-text");
const translateButton = document.getElementById("translate-button");
const scriptButtons = document.querySelectorAll("[data-script]");
const result = document.getElementById("result");
const copyButton = document.getElementById("copy-button");
const speakButton = document.getElementById("speak-button");
const message = document.getElementById("message");

let settings;
let script = "arabic";
let lastSelectionTime = 0; // avoids translating the same selection twice (load + onChanged)
let latestRequest = 0; // only the newest translation request may update the UI

init();

async function init() {
  settings = await loadSettings();
  setScript(settings.defaultScript);

  // A selection made before the panel finished loading is already in session storage.
  const { pendingSelection } = await chrome.storage.session.get("pendingSelection");
  handleSelection(pendingSelection);
}

// New selections while the panel is open, and settings saved in the options page.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.pendingSelection) {
    handleSelection(changes.pendingSelection.newValue);
  }
  if (area === "local") {
    loadSettings().then((fresh) => (settings = fresh));
  }
});

function handleSelection(selection) {
  if (!selection || selection.requestedAt <= lastSelectionTime) {
    return;
  }
  lastSelectionTime = selection.requestedAt;
  // Consume it, so reopening the panel later does not translate an old selection again.
  chrome.storage.session.remove("pendingSelection");
  sourceText.value = selection.text;
  runTranslation();
}

async function runTranslation() {
  const text = sourceText.value.trim();
  if (!text) {
    show("Type or select some text first.", "info");
    return;
  }
  if (text.length > MAX_LENGTH) {
    show(`The text is too long (${text.length} characters, maximum ${MAX_LENGTH}).`, "error");
    return;
  }
  if (!settings.username || !settings.password) {
    show("Set the server URL, username and password in Settings first.", "error");
    return;
  }

  const requestId = ++latestRequest;
  setBusy(true);
  showResult("");
  show("Translating…", "info");
  try {
    const response = await translate(settings, text, script);
    if (requestId !== latestRequest) {
      return; // a newer request was started meanwhile
    }
    showResult(response.translation);
    show("", "info");
  } catch (error) {
    if (requestId === latestRequest) {
      show(error.message, "error");
    }
  } finally {
    if (requestId === latestRequest) {
      setBusy(false);
    }
  }
}

function setScript(value) {
  script = value === "latin" ? "latin" : "arabic";
  for (const button of scriptButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.script === script));
  }
}

function showResult(text) {
  stopSpeaking();
  result.textContent = text;
  // Arabic script reads right-to-left; Arabizi uses Latin letters and reads left-to-right.
  result.dir = script === "latin" ? "ltr" : "rtl";
  result.lang = script === "latin" ? "ar-Latn" : "ar";
  copyButton.disabled = !text;
  speakButton.disabled = !text;
}

function setBusy(busy) {
  translateButton.disabled = busy;
  translateButton.textContent = busy ? "Translating…" : "Translate";
}

function show(text, kind) {
  message.textContent = text;
  message.className = `message ${kind}`;
}

translateButton.addEventListener("click", runTranslation);

sourceText.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runTranslation();
  }
});

for (const button of scriptButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.script === script) {
      return;
    }
    setScript(button.dataset.script);
    // Re-translate what is already shown so the toggle has a visible effect.
    if (result.textContent && sourceText.value.trim()) {
      runTranslation();
    }
  });
}

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(result.textContent);
    show("Copied to the clipboard.", "ok");
  } catch {
    show("Could not copy. Select the text and press Ctrl+C.", "error");
  }
});

speakButton.addEventListener("click", async () => {
  if (isSpeaking()) {
    stopSpeaking();
    return;
  }
  if (result.lang !== "ar") {
    // Arabic voices cannot read Arabizi (they would say "three" for the 3 in "3afak").
    show("Read aloud needs Arabic script: switch to العربية and translate again.", "info");
    return;
  }
  const voice = await speak(result.textContent, () => (speakButton.textContent = "Read aloud"));
  if (!voice) {
    show(
      "No Arabic voice is installed. On Windows: Settings → Time & language → Speech → Add voices → Arabic, then restart Chrome.",
      "error"
    );
    return;
  }
  speakButton.textContent = "Stop";
  show(`Reading with ${voice.name} (${voice.lang}).`, "info");
});

document.getElementById("options-button").addEventListener("click", () => chrome.runtime.openOptionsPage());
