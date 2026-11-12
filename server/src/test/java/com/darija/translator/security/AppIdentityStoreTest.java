package com.darija.translator.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.security.enterprise.credential.UsernamePasswordCredential;
import jakarta.security.enterprise.identitystore.CredentialValidationResult;
import jakarta.security.enterprise.identitystore.CredentialValidationResult.Status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AppIdentityStoreTest {

    private AppIdentityStore store;

    @BeforeEach
    void setUp() {
        store = new AppIdentityStore();
        store.username = "demo";
        store.password = "s3cret";
    }

    @Test
    void rightCredentialsAreAcceptedWithUserGroup() {
        CredentialValidationResult result = store.validate(new UsernamePasswordCredential("demo", "s3cret"));

        assertEquals(Status.VALID, result.getStatus());
        assertEquals("demo", result.getCallerPrincipal().getName());
        assertTrue(result.getCallerGroups().contains("user"));
    }

    @Test
    void wrongPasswordIsRejected() {
        assertEquals(Status.INVALID, store.validate(new UsernamePasswordCredential("demo", "wrong")).getStatus());
    }

    @Test
    void wrongUsernameIsRejected() {
        assertEquals(Status.INVALID, store.validate(new UsernamePasswordCredential("admin", "s3cret")).getStatus());
    }

    @Test
    void passwordPrefixIsRejected() {
        assertEquals(Status.INVALID, store.validate(new UsernamePasswordCredential("demo", "s3cre")).getStatus());
    }

    @Test
    void comparisonIsCaseSensitive() {
        assertEquals(Status.INVALID, store.validate(new UsernamePasswordCredential("DEMO", "s3cret")).getStatus());
        assertEquals(Status.INVALID, store.validate(new UsernamePasswordCredential("demo", "S3CRET")).getStatus());
    }
}
