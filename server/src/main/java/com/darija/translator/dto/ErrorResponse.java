package com.darija.translator.dto;

/** Body of every error response: {@code { "error": "..." }}. */
public record ErrorResponse(String error) {
}
