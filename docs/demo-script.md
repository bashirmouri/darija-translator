# Demo script (5 minutes)

About 1 minute of code, 4 minutes of live demo. Times are cumulative.

## Before recording (checklist)

- [ ] `server.env` has a working `GEMINI_MODEL`; one curl translation succeeded in the last few minutes
      (Gemini is sometimes slow or overloaded — have a backup model name ready).
- [ ] Server running: `cd server` → `mvn liberty:dev`, console shows "ready to run a smarter planet".
- [ ] Chrome: extension loaded, options saved and "Test connection" shows two ✔. A web page with English text
      open (e.g. a news article). Side panel closed.
- [ ] Postman: collection imported, `username` / `password` variables set.
- [ ] PHP running (`cd php` → `php -S localhost:8000`), page open in a tab.
- [ ] Streamlit running (`cd python` → `.venv\Scripts\activate` → `streamlit run app.py`), page open in a tab.
- [ ] Phone on the same Wi-Fi, Expo Go open with the app loaded (`cd mobile` → `npx expo start`), screen mirrored
      or camera ready.
- [ ] IDE open on the four files used in part 1; font size large enough to read in the video.
- [ ] Notifications off.

## 0:00 – 0:15 · Introduction

> "This is Darija Translator: a Jakarta EE REST service that uses Google Gemini to translate any text into
> Moroccan Arabic, and four clients that use it — a Chrome extension, a PHP page, a Python app and a mobile app."

Show the README architecture section (diagram) for a few seconds.

## 0:15 – 1:15 · Code walkthrough

1. **`TranslatorResource.translate`** (`server/.../rest/TranslatorResource.java`) — 20 s
   > "`@POST`, JSON in and out, `@RolesAllowed("user")`. It validates the text, asks `PromptBuilder` for the
   > prompt and calls the injected `TranslationProvider`. Errors are exceptions that carry their own HTTP status;
   > one exception mapper turns them into `{ "error": … }`."
2. **`TranslationProvider` / `GeminiTranslationProvider`** — 15 s
   > "The resource only knows this interface. The Gemini implementation is a plain `HttpClient` call, API key in
   > a header, 30-second timeout: 429 becomes a rate-limit error, anything else a 502."
3. **Security** (`SecurityConfig`, `AppIdentityStore`) — 10 s
   > "Basic authentication with Jakarta Security. The identity store checks the configured user with a
   > constant-time comparison. Credentials and the key come from environment variables, never from git."
4. **Extension flow** (`extension/background.js`) — 15 s
   > "The context-menu click stores the selection in session storage and opens the side panel synchronously,
   > because Chrome only allows that during the user's click. The panel reads the text and translates it."

## 1:15 – 2:00 · Postman: security and errors

1. *Health* → `200 {"status":"ok","provider":"gemini"}` (no credentials needed).
2. *No credentials - 401* → `401` with `WWW-Authenticate: Basic realm="darija"`.
3. *Wrong password - 401* → `401`.
4. *Translate (Arabic script) - 200* → show the Darija translation and the green test results.
5. *Text too long* → `400` with the error message.
   > "Every error has a clear status and message; the clients show these messages to the user."

## 2:00 – 3:15 · Chrome extension (main client)

1. On the web page, select a sentence → right-click → **Translate to Darija**.
   > "The side panel opens with the selected text already pasted and translated — nothing to copy by hand."
2. Select a second sentence while the panel is open → right-click again → it translates the new text.
3. Click **Arabizi** → re-translation in Latin letters (point out 3, 7, 9). Back to **العربية**.
4. **Read aloud** → the translation is spoken with an Arabic voice. **Copy** → "Copied".
5. (Optional, 10 s) Options page → **Test connection** → two ✔.

## 3:15 – 3:45 · PHP client

Type "I'm going to the market to buy bread." → **Translate** → right-to-left result.
> "Plain PHP and cURL, same API, same Basic Auth."

## 3:45 – 4:15 · Python client

Show the sidebar ("Reachable · LLM: gemini"), type a sentence, choose Arabizi, **Translate**.
> "Streamlit with `requests` — the health check in the sidebar uses the public endpoint."

## 4:15 – 4:50 · Mobile app

On the phone: type a sentence → **Translate** → result; **Read aloud**; optionally open **Settings** and
**Test connection**.
> "The phone reaches the server over Wi-Fi using the PC's IP address — the server listens on all interfaces."

## 4:50 – 5:00 · Wrap-up

> "One REST service, one prompt, four clients. The code, diagrams, Postman collection and setup steps are
> all in the GitHub repository."

## If something goes wrong while recording

- **502 "Gemini HTTP 503" or "did not answer in time"**: say "Gemini is overloaded — the API reports it as a 502
  with a clear message", then retry. That is itself a demo of the error handling.
- **Phone cannot connect**: check the phone is on the same Wi-Fi and open `http://<PC-IP>:9080/api/health` in its
  browser.
