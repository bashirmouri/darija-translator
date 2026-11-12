package com.darija.translator.dto;

/** Successful answer: the Darija text and the LLM provider that produced it. */
public record TranslationResponse(String translation, String provider) {
}
