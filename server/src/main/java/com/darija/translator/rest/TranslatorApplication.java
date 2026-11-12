package com.darija.translator.rest;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

/** Activates Jakarta REST; every resource lives under /api. */
@ApplicationPath("/api")
public class TranslatorApplication extends Application {
}
