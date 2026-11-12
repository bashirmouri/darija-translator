package com.darija.translator.dto;

/**
 * Body of POST /api/translate. Only {@code text} is required.
 * {@code script} stays a String here so that an invalid value becomes a clear 400 error
 * (see {@link Script#fromValue(String)}) instead of a JSON parsing failure.
 */
public record TranslationRequest(String text, String sourceLang, String script) {
}
