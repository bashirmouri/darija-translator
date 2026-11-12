package com.darija.translator.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.security.enterprise.authentication.mechanism.http.BasicAuthenticationMechanismDefinition;

/**
 * Turns on HTTP Basic authentication for the application.
 * Credentials are checked by {@link AppIdentityStore}.
 */
@BasicAuthenticationMechanismDefinition(realmName = "darija")
@ApplicationScoped
public class SecurityConfig {
}
