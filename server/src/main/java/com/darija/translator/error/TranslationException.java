package com.darija.translator.error;

/** Base class for every error the API reports; each subclass knows its HTTP status. */
public abstract class TranslationException extends RuntimeException {

    protected TranslationException(String message) {
        super(message);
    }

    protected TranslationException(String message, Throwable cause) {
        super(message, cause);
    }

    /** HTTP status code sent to the client. */
    public abstract int status();
}
