package com.darija.translator.rest;

import com.darija.translator.llm.TranslationProvider;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/** GET /api/health: lets clients check that the server is reachable and which LLM it uses. */
@Path("/health")
@RequestScoped
public class HealthResource {

    @Inject
    TranslationProvider provider;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public JsonObject health() {
        return Json.createObjectBuilder()
                .add("status", "ok")
                .add("provider", provider.name())
                .build();
    }
}
