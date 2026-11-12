package com.darija.translator.llm;

import com.darija.translator.error.ProviderException;
import com.darija.translator.error.RateLimitException;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonReader;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.logging.Logger;

/** Calls the Google Gemini REST API (generateContent) with the JDK HttpClient; no Google SDK. */
@ApplicationScoped
public class GeminiTranslationProvider implements TranslationProvider {

    private static final Logger LOG = Logger.getLogger(GeminiTranslationProvider.class.getName());
    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Inject
    @ConfigProperty(name = "GEMINI_API_KEY")
    String apiKey;

    @Inject
    @ConfigProperty(name = "GEMINI_MODEL")
    String model;

    @Override
    public String translate(String prompt) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + model + ":generateContent"))
                .timeout(REQUEST_TIMEOUT)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey) // in a header, never in the URL, so it never shows up in logs
                .POST(HttpRequest.BodyPublishers.ofString(requestBody(prompt)))
                .build();

        HttpResponse<String> response = send(request);
        int status = response.statusCode();
        if (status == 429) {
            LOG.warning("Gemini rate limit hit (HTTP 429)");
            throw new RateLimitException("The translation service is busy (rate limit reached). Please wait and try again.");
        }
        if (status < 200 || status > 299) {
            LOG.warning("Gemini call failed with HTTP " + status);
            throw new ProviderException("The translation model is unavailable (Gemini HTTP " + status + ").");
        }
        return extractText(response.body());
    }

    @Override
    public String name() {
        return "gemini";
    }

    private HttpResponse<String> send(HttpRequest request) {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException e) {
            LOG.warning("Gemini call timed out");
            throw new ProviderException("The translation model did not answer in time.", e);
        } catch (IOException e) {
            LOG.warning("Gemini call failed: " + e.getClass().getSimpleName());
            throw new ProviderException("Could not reach the translation model.", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ProviderException("The translation was interrupted.", e);
        }
    }

    /** {"contents":[{"parts":[{"text": prompt}]}]} */
    private static String requestBody(String prompt) {
        return Json.createObjectBuilder()
                .add("contents", Json.createArrayBuilder()
                        .add(Json.createObjectBuilder()
                                .add("parts", Json.createArrayBuilder()
                                        .add(Json.createObjectBuilder().add("text", prompt)))))
                .build()
                .toString();
    }

    /** Reads candidates[0].content.parts[0].text; anything missing or blank is a provider error. */
    private static String extractText(String responseBody) {
        String text = "";
        try (JsonReader reader = Json.createReader(new StringReader(responseBody))) {
            text = reader.readObject()
                    .getJsonArray("candidates").getJsonObject(0)
                    .getJsonObject("content")
                    .getJsonArray("parts").getJsonObject(0)
                    .getString("text")
                    .trim();
        } catch (RuntimeException e) {
            // Malformed JSON, or a field is missing (e.g. a response blocked by safety filters has no content).
            LOG.warning("Gemini response had no text: " + e.getClass().getSimpleName());
        }
        if (text.isEmpty()) {
            throw new ProviderException("The translation model returned no text.");
        }
        return text;
    }
}
