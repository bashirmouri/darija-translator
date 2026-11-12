package com.darija.translator.rest;

import com.darija.translator.dto.ErrorResponse;
import com.darija.translator.error.TranslationException;

import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/** Turns any TranslationException into its HTTP status with a JSON {@code { "error": ... }} body. */
@Provider
public class TranslationExceptionMapper implements ExceptionMapper<TranslationException> {

    @Override
    public Response toResponse(TranslationException e) {
        return Response.status(e.status())
                .type(MediaType.APPLICATION_JSON)
                .entity(toBody(e))
                .build();
    }

    // Separate from toResponse so unit tests can check the body without a JAX-RS runtime.
    static ErrorResponse toBody(TranslationException e) {
        return new ErrorResponse(e.getMessage());
    }
}
