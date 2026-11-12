package com.darija.translator.rest;

import com.darija.translator.dto.Script;
import com.darija.translator.dto.TranslationRequest;
import com.darija.translator.dto.TranslationResponse;
import com.darija.translator.error.InvalidRequestException;
import com.darija.translator.llm.PromptBuilder;
import com.darija.translator.llm.TranslationProvider;

import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** POST /api/translate: translates the request text into Moroccan Darija. Requires Basic Auth. */
@Path("/translate")
@RequestScoped
public class TranslatorResource {

    static final int MAX_TEXT_LENGTH = 5_000;

    @Inject
    TranslationProvider provider;

    @Inject
    PromptBuilder promptBuilder;

    @POST
    @RolesAllowed("user")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response translate(TranslationRequest request) {
        String text = validText(request);
        Script script = Script.fromValue(request.script());

        String prompt = promptBuilder.build(text, request.sourceLang(), script);
        String translation = provider.translate(prompt);

        return Response.ok(new TranslationResponse(translation, provider.name())).build();
    }

    /** Returns the trimmed text, or throws InvalidRequestException (400) if it is missing or too long. */
    static String validText(TranslationRequest request) {
        if (request == null || request.text() == null || request.text().isBlank()) {
            throw new InvalidRequestException("The 'text' field is required and must not be blank.");
        }
        String text = request.text().trim();
        if (text.length() > MAX_TEXT_LENGTH) {
            throw new InvalidRequestException(
                    "The 'text' field is too long (" + text.length() + " characters, maximum " + MAX_TEXT_LENGTH + ").");
        }
        return text;
    }
}
