package com.darija.translator.error;

/** The LLM call failed, timed out or returned no text (502 Bad Gateway). */
public class ProviderException extends TranslationException {

    public ProviderException(String message) {
        super(message);
    }

    public ProviderException(String message, Throwable cause) {
        super(message, cause);
    }

    @Override
    public int status() {
        return 502;
    }
}
