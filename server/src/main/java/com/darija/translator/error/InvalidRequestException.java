package com.darija.translator.error;

/** The client sent a request we cannot translate (400). */
public class InvalidRequestException extends TranslationException {

    public InvalidRequestException(String message) {
        super(message);
    }

    @Override
    public int status() {
        return 400;
    }
}
