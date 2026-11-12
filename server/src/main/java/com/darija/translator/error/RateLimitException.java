package com.darija.translator.error;

/** The LLM provider rejected the call because of its rate limit or quota (429). */
public class RateLimitException extends TranslationException {

    public RateLimitException(String message) {
        super(message);
    }

    @Override
    public int status() {
        return 429;
    }
}
