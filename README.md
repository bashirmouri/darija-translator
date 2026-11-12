# Darija Translator

An LLM-powered RESTful web service that translates text (any language, usually English) into
**Moroccan Arabic (Darija)**, with four clients: a Chrome extension, a PHP web form, a Python
(Streamlit) app and a React Native (Expo) mobile app.

> Work in progress — sections are filled in as each phase is completed.

## Features

_TODO_

## Architecture

_TODO: embed class and deployment diagrams from `docs/`._

## Repository layout

| Folder | Contents |
|---|---|
| `server/` | Java 21 REST service (Maven, Jakarta EE 10, Open Liberty) |
| `extension/` | Chrome extension (Manifest V3, side panel) |
| `php/` | PHP client (plain cURL web form) |
| `python/` | Python client (Streamlit) |
| `mobile/` | React Native client (Expo) |
| `postman/` | Postman collection for the API |
| `docs/` | UML diagrams, screenshots, demo script, blog draft |

## Tech stack and design choices

_TODO_

## Prerequisites

- **JDK 21 or newer** (the code targets Java 21)
- **Maven 3.9+** (downloads Open Liberty automatically, nothing to install)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)

## Configuration

All server variables are documented in [`.env.example`](.env.example). Secrets are never committed.

Open Liberty reads its configuration from environment variables (through MicroProfile Config) and does
**not** read a `.env` file from the repository root. Put your values in
`server/src/main/liberty/config/server.env` (gitignored; the Liberty Maven plugin copies it into the server):

```properties
LLM_PROVIDER=gemini
GEMINI_API_KEY=paste-your-key-here
GEMINI_MODEL=gemini-flash-model-name
APP_USERNAME=choose-a-username
APP_PASSWORD=choose-a-password
```

Write the values as plain text: no quotes, no `< >`, no spaces around `=`. `GEMINI_MODEL` is the exact
model name shown in Google AI Studio. `APP_USERNAME` / `APP_PASSWORD` are the Basic Auth credentials every
client must send.

Alternatively, export the same variables in your shell before starting the server.
If a required variable is missing or empty, the application does not start and the log names it
(e.g. `Failed to Inject @ConfigProperty for key APP_PASSWORD`); values are never logged.
After editing `server.env`, restart the server (dev mode does not reload it).

## Running

### Server

```bash
cd server
mvn liberty:dev        # dev mode with hot reload; press Enter to re-run tests, q to quit
```

The API is served at `http://localhost:9080/api` (and on your PC's LAN IP, port 9080).
Wait for `The defaultServer server is ready to run a smarter planet.` in the console.

Other commands:

```bash
mvn -q verify          # compile and run the unit tests
mvn liberty:run        # run without dev mode (Ctrl+C to stop)
```

### Chrome extension

_TODO_

### PHP client

_TODO_

### Python client

_TODO_

### Mobile client

_TODO_

## API reference

### `POST /api/translate`

Requires HTTP Basic authentication (`Authorization: Basic <base64(username:password)>`).

Request (`Content-Type: application/json`):

```json
{ "text": "Where is the train station?", "sourceLang": "en", "script": "arabic" }
```

| Field | Required | Notes |
|---|---|---|
| `text` | yes | 1–5,000 characters after trimming |
| `sourceLang` | no | ISO code such as `en`, `fr`; auto-detected when absent |
| `script` | no | `arabic` (default) or `latin` (Arabizi), case-insensitive |

Success — `200`:

```json
{ "translation": "فين كاينة لاگار؟", "provider": "gemini" }
```

Errors have the body `{ "error": "<message>" }` (except 401, see below):

| Status | When |
|---|---|
| 400 | `text` missing, blank or longer than 5,000 characters; invalid `script`; malformed JSON |
| 401 | missing or wrong credentials (empty body plus a `WWW-Authenticate: Basic realm="darija"` header; sent by Jakarta Security before the application code runs) |
| 429 | the LLM provider's rate limit was hit — wait and retry |
| 502 | the LLM call failed, timed out or returned no text |

### `GET /api/health`

No authentication. `200 { "status": "ok", "provider": "gemini" }`.

### curl examples

(Git Bash, macOS or Linux. Replace `USER:PASS` with the values of `APP_USERNAME` / `APP_PASSWORD`.
In Windows `cmd`, use double quotes and escape the inner ones: `-d "{\"text\": \"Hello\"}"`.)

```bash
# Health check
curl http://localhost:9080/api/health

# Translate into Arabic script
curl -X POST http://localhost:9080/api/translate -u USER:PASS \
  -H "Content-Type: application/json" \
  -d '{"text": "Where is the train station?", "sourceLang": "en"}'

# Translate into Arabizi
curl -X POST http://localhost:9080/api/translate -u USER:PASS \
  -H "Content-Type: application/json" \
  -d '{"text": "I am going to the market to buy bread.", "script": "latin"}'

# 400: blank text
curl -X POST http://localhost:9080/api/translate -u USER:PASS \
  -H "Content-Type: application/json" -d '{"text": "  "}'

# 401: no credentials, then a wrong password (-i shows the status line)
curl -i -X POST http://localhost:9080/api/translate \
  -H "Content-Type: application/json" -d '{"text": "Hello"}'
curl -i -X POST http://localhost:9080/api/translate -u USER:wrong-password \
  -H "Content-Type: application/json" -d '{"text": "Hello"}'
```

A Postman collection with the same requests (and test assertions) is in
[`postman/darija-translator.postman_collection.json`](postman/darija-translator.postman_collection.json).
Import it, then set the `baseUrl`, `username` and `password` collection variables.

## Security notes

- **Basic Auth over plain HTTP is acceptable only on a trusted local network** (home or campus Wi-Fi for the demo).
  Credentials are base64-encoded, not encrypted; anyone on the network can read them. A real deployment needs HTTPS.
- The server listens on all interfaces (`host="*"`) so the phone can reach it over Wi-Fi.
- One user, configured with `APP_USERNAME` / `APP_PASSWORD`; passwords are compared in constant time.
- `/api/health` is public; `/api/translate` requires the `user` role.
- Secrets live only in `server/src/main/liberty/config/server.env` or shell variables, both outside git
  (`.gitignore` covers `.env`, `server.env` and `php/config.php`). The Gemini key is sent in the
  `x-goog-api-key` header, never in a URL, and neither keys, passwords nor the text to translate are logged.

## Screenshots

_TODO_

## Demo video and blog

- Demo video: _TODO_
- Blog post: _TODO_

## Author

_TODO: author and course._
