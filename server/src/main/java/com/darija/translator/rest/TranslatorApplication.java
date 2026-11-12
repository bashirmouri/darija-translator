package com.darija.translator.rest;

import jakarta.annotation.security.DeclareRoles;
import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

/** Activates Jakarta REST; every resource lives under /api. Declares the single "user" role. */
@ApplicationPath("/api")
@DeclareRoles({"user"})
public class TranslatorApplication extends Application {
}
