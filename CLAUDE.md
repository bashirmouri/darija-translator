# Darija Translator — build guide for Claude Code

You are building, end to end, a university mini-project: an **LLM-powered RESTful web service** that translates
text (any source language, usually English) into **Moroccan Arabic (Darija)**, plus a Chrome extension and three
other clients. Graded deliverables: working Maven project, working clients, UML (class + deployment, optional
use case + sequence), a clean commit history, a descriptive README, a 5-minute demo video and an optional blog post.

Work through the **phases** at the end of this file in order. Each phase has a "done when" checklist.

---

## 1. How to work

- Always run from the **repo root**. If the repo is not a git repository yet, run `git init` first and create the folder layout below.
- **One phase at a time.** At the end of each phase: run its checks, commit, then stop and tell the human
  (a) what was built, (b) exactly what they should test by hand, and (c) anything they must provide. Wait for their go-ahead before the next phase.
- **Ask the human** before: adding a dependency not listed here, changing the API contract, renaming anything in the class diagram, or deleting files.
- **The human must provide** (never invent or fetch these): the Gemini API key, the demo username/password, their PC's LAN IP, and confirmation of anything tested on a real phone or in Chrome.
- **Commits:** small and focused, Conventional Commits style (`feat(server): …`, `fix(extension): …`, `test(server): …`, `docs: …`, `chore: …`). One logical change per commit. The history is graded, so never squash phases into one commit.
- **Code style:** simple and readable for a student project — clear names, short classes, comments only where the *why* is not obvious. No frameworks beyond those listed.
- **Secrets:** never read, print, log or commit `.env`, `server.env` or any API key. Never paste a key into code, tests or docs.
- Keep `docs/` diagrams and the README in sync with the code (see section 9).

## 2. Repo layout (monorepo)

```
.
├── CLAUDE.md
├── README.md
├── .gitignore
├── .env.example                 # documents every variable, empty values, committed
├── server/                      # Java REST service (Maven, Jakarta EE 10, Open Liberty)
├── extension/                   # Chrome extension (Manifest V3, side panel)
├── php/                         # PHP client (plain cURL web form)
├── python/                      # Python client (Streamlit)
├── mobile/                      # React Native client (Expo)
├── postman/                     # Postman collection for the API
└── docs/                        # PlantUML diagrams (+ rendered PNG/SVG), screenshots, demo script, blog draft
```

`.gitignore` must include at least: `target/`, `node_modules/`, `.expo/`, `__pycache__/`, `*.pyc`, `.venv/`,
`.env`, `server.env`, `.DS_Store`, `.idea/`, `*.iml`, `.vscode/` (except shared settings if added on purpose).

## 3. Server — fixed decisions

- **Java 21** (`maven.compiler.release` 21), **Jakarta EE 10**, **Open Liberty** via `io.openliberty.tools:liberty-maven-plugin` (embedded runtime; `mvn liberty:dev` for hot reload).
- Maven: `groupId` `com.darija`, `artifactId` `darija-translator`, packaging `war`, final name `darija-translator`.
- Dependencies (scope `provided`): `jakarta.platform:jakarta.jakartaee-api:10.0.0`, `org.eclipse.microprofile.config:microprofile-config-api`.
  Test only: JUnit 5. Nothing else without asking. **No Google SDK** — call Gemini with `java.net.http.HttpClient` + JSON-B.
- Liberty features in `server/src/main/liberty/config/server.xml` (check current versions against Open Liberty docs):
  `restfulWS-3.1`, `jsonb-3.0`, `jsonp-2.1`, `cdi-4.0`, `appSecurity-5.0`, `mpConfig-3.1`.
- `httpEndpoint` with `host="*"` and `httpPort="9080"` so the phone can reach it over the LAN. HTTP only (document in README that Basic Auth over HTTP is acceptable only on a trusted local network).
- **No CORS filter.** No client needs one: the extension uses `host_permissions`, PHP and Streamlit call from their own server side, React Native is not a browser. Do not add one.

### Package and classes — must match `docs/class-diagram.puml`

Base package `com.darija.translator`:

| Package | Classes |
|---|---|
| `rest` | `TranslatorApplication` (`@ApplicationPath("/api")`, `@DeclareRoles({"user"})`), `TranslatorResource` (`@Path("/translate")`), `HealthResource` (`@Path("/health")`), `TranslationExceptionMapper` (`ExceptionMapper<TranslationException>`) |
| `dto` | `TranslationRequest` (`text`, `sourceLang`, `script`), `TranslationResponse` (`translation`, `provider`), `ErrorResponse` (`error`), enum `Script` (`ARABIC`, `LATIN`) |
| `llm` | interface `TranslationProvider` (`translate(String prompt)`, `name()`), `GeminiTranslationProvider`, `OllamaTranslationProvider`, `ProviderProducer` (CDI `@Produces`, picks by `LLM_PROVIDER`), `PromptBuilder` |
| `security` | `SecurityConfig` (`@BasicAuthenticationMechanismDefinition(realmName = "darija")`, `@ApplicationScoped`), `AppIdentityStore` (implements `IdentityStore`) |
| `error` | abstract `TranslationException` (`status()`), `InvalidRequestException` (400), `RateLimitException` (429), `ProviderException` (502) |

`HealthResource` is the only class not in the original diagram — add it to `docs/class-diagram.puml` when you create it.

### Behaviour

- **`TranslatorResource.translate(TranslationRequest)`** — the business method named in the brief; do not rename.
  `@POST`, consumes and produces JSON, `@RolesAllowed("user")`. Validates input (throws `InvalidRequestException`),
  builds the prompt with `PromptBuilder`, calls the injected `TranslationProvider`, returns `TranslationResponse`.
- **`HealthResource`** — `GET /api/health`, `@PermitAll`, returns `{ "status": "ok", "provider": "<name>" }`. Clients use it for a "server reachable" check.
- **`AppIdentityStore`** — validates `UsernamePasswordCredential` against `APP_USERNAME` / `APP_PASSWORD` from MicroProfile Config, compares with `MessageDigest.isEqual` (constant time), returns group `user` on success.
  If Liberty answers 403 for a valid user, map role `user` to group `user` with an `application-bnd` entry in `server.xml`.
- **`PromptBuilder`** — one place for the prompt: translate into Moroccan Darija (explicitly *not* Modern Standard Arabic),
  auto-detect the source language unless `sourceLang` is given, output **only** the translation (no quotes, notes or transliteration unless asked),
  Arabic script by default, Latin Arabizi (digits 3, 7, 9) when `script` is `LATIN`, plus 3–5 few-shot example pairs. Keep the examples in a constant list.
- **`GeminiTranslationProvider`** — `POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent`, API key in the `x-goog-api-key` header (never in the URL),
  reads `candidates[0].content.parts[0].text`, trims it. HTTP 429 → `RateLimitException`; other non-2xx, empty text, or timeout → `ProviderException`.
- **`OllamaTranslationProvider`** — `POST {OLLAMA_URL}/api/chat` with `"stream": false`, reads `message.content`. Errors → `ProviderException`.
- **`HttpClient`** — one shared instance per provider, connect timeout 10 s, request timeout 30 s.
- Never log the request text at INFO level or any credential. Log provider errors with status code only.

## 4. API contract (all clients follow this; change only with the human's approval)

`POST /api/translate` — headers `Authorization: Basic <base64(user:pass)>`, `Content-Type: application/json`

```json
{ "text": "Where is the train station?", "sourceLang": "en", "script": "arabic" }
```
- `text` required, 1–5,000 characters after trimming.
- `sourceLang` optional (ISO code); auto-detect when absent.
- `script` optional: `arabic` (default) or `latin`, case-insensitive.

`200`:
```json
{ "translation": "…", "provider": "gemini" }
```

Errors — body always `{ "error": "<human-readable message>" }`:

| Status | When |
|---|---|
| 400 | `text` missing, blank, or over 5,000 characters; invalid `script` |
| 401 | missing or wrong credentials (produced by Jakarta Security) |
| 429 | LLM provider rate limit hit |
| 502 | LLM call failed, timed out, or returned no text |

`GET /api/health` — no auth — `200 { "status": "ok", "provider": "gemini" }`.

If the contract changes: update all clients, the Postman collection, the README and the sequence diagram in the same change.

## 5. Configuration and secrets

Server config comes from **MicroProfile Config**, which reads environment variables. Open Liberty does **not** read
a `.env` file from the repo root. Use either:
- `server/src/main/liberty/config/server.env` (gitignored; the Liberty Maven plugin copies it into the server), or
- variables exported in the shell before `mvn liberty:dev`.

Variables (document all of them in `.env.example`, empty values):
```
LLM_PROVIDER=gemini            # gemini | ollama
GEMINI_API_KEY=
GEMINI_MODEL=                  # a current Flash model from Google AI Studio
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=
APP_USERNAME=
APP_PASSWORD=
```
Clients read their own settings (server URL, username, password) from their own config: extension options page,
`python/.env` via env vars, `php/config.php` (gitignored, with a committed `config.example.php`), `mobile/.env` with `EXPO_PUBLIC_*` variables.
If a required server variable is missing at startup, fail with a clear message naming the variable (never its value).

## 6. Chrome extension (`extension/`, Manifest V3, plain JS, no build step)

- Files: `manifest.json`, `background.js` (service worker), `sidepanel.html/.js/.css`, `options.html/.js`, `icons/`.
- `manifest.json`: `"manifest_version": 3`, permissions `contextMenus`, `sidePanel`, `storage`; `host_permissions` for `http://localhost:9080/*`
  (and document how to add the LAN URL); `"side_panel": { "default_path": "sidepanel.html" }`; `"options_page": "options.html"`.
- **Flow (required by the brief — selected text is copied and pasted automatically):**
  1. `chrome.runtime.onInstalled` creates a context-menu item for the `selection` context: "Translate to Darija".
  2. `chrome.contextMenus.onClicked` saves `info.selectionText` to `chrome.storage.session`, then calls
     `chrome.sidePanel.open({ windowId: tab.windowId })` **synchronously inside that handler** (Chrome requires a user gesture; do not `await` anything before it).
  3. The side panel reads the text on load **and** listens to `chrome.storage.onChanged`, so a new selection translates even when the panel is already open.
  4. The text box is filled and translation starts automatically; the user can also edit and press Translate.
- **Options page:** server URL, username, password, default script; saved in `chrome.storage.local`; a "Test connection" button calling `/api/health` then an authenticated request.
- **UI:** show the translation with `dir="rtl" lang="ar"`; copy button; script toggle (Arabic / Arabizi); clear error messages per status code (401 → check credentials, 429 → wait and retry, 502 → model unavailable, network error → server not reachable).
- **Read aloud:** `speechSynthesis` with an `ar-MA` voice if available, otherwise any `ar*` voice, otherwise show a message.
- **Voice input (extra):** `webkitSpeechRecognition`. Chrome **cannot show the microphone permission prompt inside a side panel**, so the options page
  must have an "Enable microphone" button that calls `navigator.mediaDevices.getUserMedia({ audio: true })` once; the side panel then uses speech recognition and explains this if permission is missing.
  Recognition language is selectable (default `en-US`). Voice-to-voice = speak → translate → read aloud automatically.

## 7. Other clients

- **PHP (`php/`):** single `index.php` with a form, plain cURL (`CURLOPT_USERPWD`, JSON body, timeout 40 s), no Composer.
  Escape all output with `htmlspecialchars`; show the translation in an RTL block; show API errors. Run: `php -S localhost:8000`.
- **Python (`python/`):** `app.py` with Streamlit + `requests` (`auth=(user, pass)`, `timeout=40`); `requirements.txt` pinned to major versions.
  Text area, script selector, translate button, RTL result, error display, health check in the sidebar. Run: `streamlit run app.py`.
- **React Native (`mobile/`):** Expo (TypeScript template), run in **Expo Go**. Base URL from `EXPO_PUBLIC_API_URL` = `http://<PC-LAN-IP>:9080`, **never `localhost`**.
  Basic Auth header via `btoa` (or ask before adding a base64 package if unavailable). Screens: translate (input, script toggle, result RTL, copy, read aloud with `expo-speech`) and settings.
  Mobile voice input is **out of scope** unless the human asks for it.
- Every client: shows the API's `error` message, handles network failure, and never hard-codes credentials in committed files.

## 8. Testing

- **Server unit tests (JUnit 5):** `PromptBuilder` (Arabic vs Latin instructions, sourceLang handling), request validation (blank, too long, bad script),
  `TranslationExceptionMapper` (status + body), `AppIdentityStore` (valid / invalid). Do not call the real Gemini API in tests.
- `mvn -q verify` in `server/` must pass before every server commit.
- **Postman:** `postman/darija-translator.postman_collection.json` with a `baseUrl`, `username`, `password` collection variables (no real values), and requests for:
  health, translate 200, translate `script=latin`, 400 blank text, 400 too long, 401 no auth, 401 wrong password. Also add equivalent `curl` examples to the README.
- Manual checks you cannot do yourself (Chrome, phone, real key) go in your end-of-phase message as a checklist for the human.

## 9. Documentation

- `docs/` already contains PlantUML sources for: `class-diagram.puml`, `deployment-diagram.puml`, `use-case-diagram.puml`, `sequence-diagram.puml`, with PNG/SVG renders.
  When code changes structure, update the `.puml` sources; ask the human to re-render if PlantUML is not available locally.
- `README.md` (build it up phase by phase): project overview and features; architecture (embed the PNG diagrams); tech stack and design choices with one-line reasons;
  prerequisites; configuration (`.env.example`, `server.env`); how to run the server and each client; API reference with curl examples;
  security notes (Basic Auth over HTTP on LAN only, secrets handling); screenshots (`docs/screenshots/`); demo video and blog links (placeholders until provided); author and course.
- `docs/demo-script.md`: a 5-minute script — about 1 minute code walkthrough (resource, provider interface, security, extension flow), 4 minutes live demo
  (Postman 401/200, extension right-click → side panel → read aloud → voice, PHP, Python, mobile).
- `docs/blog-draft.md` (optional deliverable): development process, design choices, challenges (Darija quality, side-panel mic permission, LAN access from phone, rate limits), result.

## 10. Phases

**Phase 0 — Setup**
`git init` if needed, folder layout, `.gitignore`, `.env.example`, README skeleton. Commit.
Done when: `git status` is clean and no secret file is tracked.

**Phase 1 — Prompt check** (human-led)
Write the prompt and few-shot examples into `docs/prompt.md`, and ask the human to try it in Google AI Studio and report back. Adjust until they are happy.
Done when: the human confirms translation quality.

**Phase 2 — REST service**
Maven project, Liberty config, packages/classes from section 3 without security yet (no `@RolesAllowed`), Gemini provider, `PromptBuilder`, validation, exception mapper, health endpoint, unit tests, Postman collection, README "Run the server".
Done when: `mvn -q verify` passes; human confirms `curl` to `/api/translate` returns Darija and `/api/health` returns ok.

**Phase 3 — Security**
`SecurityConfig`, `AppIdentityStore`, `@RolesAllowed("user")`, `@PermitAll` on health, config validation, tests, Postman 401 cases.
Done when: no/wrong credentials → 401, right credentials → 200, health works without auth.

**Phase 4 — Chrome extension**
Everything in section 6 except voice input.
Done when: human confirms right-click → side panel opens with the selected text already filled in and translated; options page saves and tests the connection; read aloud works.

**Phase 5 — PHP, Python, React Native clients**
One client per commit (or more), each with its README section.
Done when: human confirms each client translates, shows errors on wrong credentials, and the phone reaches the server over Wi-Fi.

**Phase 6 — Extras**
Voice input + voice-to-voice in the extension; `OllamaTranslationProvider` + `ProviderProducer` switching via `LLM_PROVIDER`.
Done when: human confirms voice flow in Chrome; switching `LLM_PROVIDER=ollama` and restarting serves translations from the local model.

**Phase 7 — Documentation and diagrams**
Sync all four `.puml` files with the final code, complete README, `docs/demo-script.md`, `docs/blog-draft.md`.
Done when: every class in the code appears in the class diagram, README run instructions work from a clean clone, and all placeholders are listed for the human.

## 11. Commands

```
cd server && mvn liberty:dev                 # dev mode, hot reload, http://localhost:9080/api
cd server && mvn -q verify                   # build + tests
cd php && php -S localhost:8000
cd python && pip install -r requirements.txt && streamlit run app.py
cd mobile && npx expo start                  # scan the QR code with Expo Go
```
Extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`. After code changes, click reload on the extension card.
