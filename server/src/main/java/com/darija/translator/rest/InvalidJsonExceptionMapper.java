package com.darija.translator.rest;

import com.darija.translator.dto.ErrorResponse;

import jakarta.json.bind.JsonbException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * A malformed or empty JSON body fails inside JSON-B, before TranslatorResource runs.
 * Without this mapper the client would get a plain-text 500; the API contract promises 400 with an error body.
 */
@Provider
public class InvalidJsonExceptionMapper implements ExceptionMapper<JsonbException> {

    static final String MESSAGE =
            "The request body must be valid JSON, e.g. { \"text\": \"Hello\", \"script\": \"arabic\" }.";

    @Override
    public Response toResponse(JsonbException e) {
        return Response.status(Response.Status.BAD_REQUEST)
                .type(MediaType.APPLICATION_JSON)
                .entity(new ErrorResponse(MESSAGE))
                .build();
    }
}
