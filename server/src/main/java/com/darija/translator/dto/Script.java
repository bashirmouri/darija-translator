package com.darija.translator.dto;

import com.darija.translator.error.InvalidRequestException;

/** Writing system of the translation: Arabic letters or Latin "Arabizi" (3, 7, 9...). */
public enum Script {
    ARABIC,
    LATIN;

    /** Parses the request value case-insensitively; a missing value means ARABIC. */
    public static Script fromValue(String value) {
        if (value == null || value.isBlank()) {
            return ARABIC;
        }
        return switch (value.trim().toLowerCase()) {
            case "arabic" -> ARABIC;
            case "latin" -> LATIN;
            default -> throw new InvalidRequestException(
                    "Invalid script '" + value + "': use 'arabic' or 'latin'.");
        };
    }
}
