package com.darija.translator.rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.darija.translator.dto.TranslationRequest;
import com.darija.translator.error.InvalidRequestException;

import org.junit.jupiter.api.Test;

class TranslatorResourceValidationTest {

    @Test
    void missingBodyIsRejected() {
        assertThrows(InvalidRequestException.class, () -> TranslatorResource.validText(null));
    }

    @Test
    void missingTextIsRejected() {
        assertThrows(InvalidRequestException.class,
                () -> TranslatorResource.validText(new TranslationRequest(null, "en", "arabic")));
    }

    @Test
    void blankTextIsRejected() {
        assertThrows(InvalidRequestException.class,
                () -> TranslatorResource.validText(new TranslationRequest("   \n ", null, null)));
    }

    @Test
    void textOverTheLimitIsRejected() {
        String tooLong = "a".repeat(TranslatorResource.MAX_TEXT_LENGTH + 1);
        InvalidRequestException e = assertThrows(InvalidRequestException.class,
                () -> TranslatorResource.validText(new TranslationRequest(tooLong, null, null)));
        assertTrue(e.getMessage().contains("too long"));
    }

    @Test
    void textAtTheLimitIsAcceptedAfterTrimming() {
        String atLimit = "a".repeat(TranslatorResource.MAX_TEXT_LENGTH);
        assertEquals(atLimit, TranslatorResource.validText(new TranslationRequest("  " + atLimit + "  ", null, null)));
    }

    @Test
    void validTextIsTrimmed() {
        assertEquals("Hello", TranslatorResource.validText(new TranslationRequest("  Hello ", null, null)));
    }
}
