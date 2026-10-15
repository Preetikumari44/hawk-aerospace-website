package com.hawkaero.contact;

import com.hawkaero.contact.web.dto.ContactRequest;

public final class TestData {

    private TestData() {
    }

    public static ContactRequest validRequest() {
        return new ContactRequest("Asha Rao", "asha@example.com", "+91", "98765 43210",
                "Hawk Farms", "India", "Yes", "Interested in a demo.", "");
    }
}
