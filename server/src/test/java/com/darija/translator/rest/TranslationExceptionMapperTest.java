package com.darija.translator.rest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.darija.translator.error.InvalidRequestException;
import com.darija.translator.error.ProviderException;
import com.darija.translator.error.RateLimitException;
import com.darija.translator.error.TranslationException;

import org.junit.jupiter.api.Test;

class TranslationExceptionMapperTest {

    @Test
    void invalidRequestIs400WithMessage() {
        TranslationException e = new InvalidRequestException("text is required");
        assertEquals(400, e.status());
        assertEquals("text is required", TranslationExceptionMapper.toBody(e).error());
    }

    @Test
    void rateLimitIs429WithMessage() {
        TranslationException e = new RateLimitException("Rate limit reached");
        assertEquals(429, e.status());
        assertEquals("Rate limit reached", TranslationExceptionMapper.toBody(e).error());
    }

    @Test
    void providerErrorIs502WithMessage() {
        TranslationException e = new ProviderException("Model unavailable", new RuntimeException("cause"));
        assertEquals(502, e.status());
        assertEquals("Model unavailable", TranslationExceptionMapper.toBody(e).error());
    }
}
