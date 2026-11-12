package com.darija.translator.llm;

/** An LLM backend that turns a ready-made prompt into a translation. */
public interface TranslationProvider {

    /**
     * Sends the prompt to the model and returns its answer, trimmed.
     *
     * @throws com.darija.translator.error.RateLimitException if the provider's rate limit is hit
     * @throws com.darija.translator.error.ProviderException  if the call fails, times out or returns no text
     */
    String translate(String prompt);

    /** Short provider name reported to clients, e.g. "gemini". */
    String name();
}
