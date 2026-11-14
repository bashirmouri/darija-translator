"""Streamlit client for the Darija Translator REST API.

Run:  streamlit run app.py
Settings come from environment variables, or from python/.env (see .env.example).
"""

import html
import os
from pathlib import Path

import requests
import streamlit as st

TIMEOUT_SECONDS = 40  # a little longer than the server's own 30 s LLM timeout
MAX_LENGTH = 5000


def load_env_file(path: Path) -> None:
    """Minimal .env reader (KEY=value lines); real environment variables win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file(Path(__file__).with_name(".env"))

API_URL = os.environ.get("DARIJA_API_URL", "http://localhost:9080").rstrip("/")
USERNAME = os.environ.get("DARIJA_USERNAME", "")
PASSWORD = os.environ.get("DARIJA_PASSWORD", "")


class ApiError(Exception):
    """An error whose message can be shown to the user as-is."""


def error_message(response: requests.Response) -> str:
    try:
        server_message = response.json().get("error", "")
    except ValueError:
        server_message = ""  # 401 has an empty body

    status = response.status_code
    if status == 400:
        return server_message or "The server rejected the request."
    if status == 401:
        return "Wrong username or password. Check DARIJA_USERNAME / DARIJA_PASSWORD in python/.env."
    if status == 404:
        return f"No translation API at {API_URL}. Check DARIJA_API_URL."
    if status == 429:
        return "The translation service is busy (rate limit). Wait a moment and try again."
    if status == 502:
        return f"{server_message or 'The translation model is unavailable right now.'} Try again in a moment."
    return server_message or f"Unexpected server response (HTTP {status})."


def call_api(method: str, path: str, **kwargs) -> dict:
    try:
        response = requests.request(method, API_URL + path, timeout=TIMEOUT_SECONDS, **kwargs)
    except requests.Timeout:
        raise ApiError("The server took too long to answer. Try again.")
    except requests.ConnectionError:
        raise ApiError(f"Server not reachable at {API_URL}. Is it running?")
    if not response.ok:
        raise ApiError(error_message(response))
    return response.json()


def check_health() -> dict:
    return call_api("GET", "/api/health")


def translate(text: str, script: str) -> str:
    body = call_api(
        "POST",
        "/api/translate",
        json={"text": text, "script": script},
        auth=(USERNAME, PASSWORD),
    )
    return body["translation"]


# ---------------------------------------------------------------- UI

st.set_page_config(page_title="Darija Translator", page_icon="🇲🇦")
st.title("Darija Translator")
st.caption("Translate any text into Moroccan Arabic (Darija).")

with st.sidebar:
    st.header("Server")
    st.write(f"`{API_URL}`")
    try:
        status = check_health()
        st.success(f"Reachable · LLM: {status['provider']}")
    except ApiError as error:
        st.error(str(error))
    st.button("Check again")  # any click re-runs the script, which re-checks
    if not USERNAME or not PASSWORD:
        st.warning("Set DARIJA_USERNAME and DARIJA_PASSWORD in python/.env.")

text = st.text_area("Text to translate", height=150, placeholder="Where is the train station?")
script_label = st.radio("Output script", ["Arabic script (العربية)", "Arabizi (Latin letters)"], horizontal=True)
script = "latin" if script_label.startswith("Arabizi") else "arabic"

if st.button("Translate", type="primary"):
    text = text.strip()
    if not text:
        st.warning("Type some text first.")
    elif len(text) > MAX_LENGTH:
        st.error(f"The text is too long ({len(text)} characters, maximum {MAX_LENGTH}).")
    else:
        try:
            with st.spinner("Translating…"):
                translation = translate(text, script)
        except ApiError as error:
            st.error(str(error))
        else:
            direction = "ltr" if script == "latin" else "rtl"
            # Escaped before being placed in HTML, so model output can never inject markup.
            st.markdown(
                f'<div dir="{direction}" lang="ar" style="font-size:1.5rem;line-height:1.8;'
                f'padding:0.75rem 1rem;border-radius:0.5rem;background:rgba(128,128,128,0.12)">'
                f"{html.escape(translation)}</div>",
                unsafe_allow_html=True,
            )
            st.code(translation, language=None)  # has a built-in copy button
