package com.hawkaero.contact.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextSanitizerTest {

    @Test
    void singleLineCollapsesWhitespaceAndStripsControlCharacters() {
        assertThat(TextSanitizer.singleLine("  Asha \r\n Rao\u0000 ")).isEqualTo("Asha Rao");
        assertThat(TextSanitizer.singleLine(null)).isEmpty();
    }

    @Test
    void multiLineKeepsParagraphsButLimitsBlankLines() {
        assertThat(TextSanitizer.multiLine("a\r\n\r\n\r\n\r\nb\u0007")).isEqualTo("a\n\nb");
    }

    @Test
    void htmlIsNotAlteredHereBecauseEscapingHappensWhereTheValueIsRendered() {
        assertThat(TextSanitizer.singleLine("<b>x</b>")).isEqualTo("<b>x</b>");
    }
}
