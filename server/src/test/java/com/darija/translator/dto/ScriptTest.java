package com.darija.translator.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.darija.translator.error.InvalidRequestException;

import org.junit.jupiter.api.Test;

class ScriptTest {

    @Test
    void missingValueDefaultsToArabic() {
        assertEquals(Script.ARABIC, Script.fromValue(null));
        assertEquals(Script.ARABIC, Script.fromValue("  "));
    }

    @Test
    void parsingIsCaseInsensitive() {
        assertEquals(Script.ARABIC, Script.fromValue("Arabic"));
        assertEquals(Script.LATIN, Script.fromValue("LATIN"));
        assertEquals(Script.LATIN, Script.fromValue(" latin "));
    }

    @Test
    void unknownValueIsRejected() {
        assertThrows(InvalidRequestException.class, () -> Script.fromValue("cyrillic"));
    }
}
