package com.darija.translator.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.security.enterprise.credential.UsernamePasswordCredential;
import jakarta.security.enterprise.identitystore.CredentialValidationResult;
import jakarta.security.enterprise.identitystore.IdentityStore;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

/**
 * Accepts exactly one user, configured with APP_USERNAME / APP_PASSWORD.
 * If either variable is missing or empty, MicroProfile Config stops the deployment
 * with an error that names the variable.
 */
@ApplicationScoped
public class AppIdentityStore implements IdentityStore {

    static final String USER_GROUP = "user";

    @Inject
    @ConfigProperty(name = "APP_USERNAME")
    String username;

    @Inject
    @ConfigProperty(name = "APP_PASSWORD")
    String password;

    public CredentialValidationResult validate(UsernamePasswordCredential credential) {
        // MessageDigest.isEqual takes the same time however many characters match, so response timing
        // reveals nothing. "&" (not "&&") always compares both values for the same reason.
        boolean valid = constantTimeEquals(credential.getCaller(), username)
                & constantTimeEquals(credential.getPasswordAsString(), password);

        return valid
                ? new CredentialValidationResult(username, Set.of(USER_GROUP))
                : CredentialValidationResult.INVALID_RESULT;
    }

    private static boolean constantTimeEquals(String given, String expected) {
        byte[] a = (given == null ? "" : given).getBytes(StandardCharsets.UTF_8);
        byte[] b = expected.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
