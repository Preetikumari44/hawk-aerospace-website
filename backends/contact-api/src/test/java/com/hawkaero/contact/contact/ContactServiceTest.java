package com.hawkaero.contact.contact;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hawkaero.contact.TestData;
import com.hawkaero.contact.config.AppProperties;
import com.hawkaero.contact.mail.EmailNotificationService;
import com.hawkaero.contact.web.dto.ContactRequest;
import com.hawkaero.contact.web.dto.ContactResponse;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;

class ContactServiceTest {

    private ContactMessageRepository repository;
    private EmailNotificationService notifications;
    private ContactService service;

    @BeforeEach
    void setUp() {
        repository = mock(ContactMessageRepository.class);
        notifications = mock(EmailNotificationService.class);
        AppProperties props = new AppProperties(null, new AppProperties.Duplicate(10), null, null, null, null);
        service = new ContactService(repository, notifications, props);
        when(repository.save(any(ContactMessage.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void storesEnquiryThenNotifies() {
        ContactResponse response = service.submit(TestData.validRequest());

        assertThat(response.success()).isTrue();
        assertThat(response.referenceId()).isNotBlank();

        ArgumentCaptor<ContactMessage> saved = ArgumentCaptor.forClass(ContactMessage.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("asha@example.com");
        assertThat(saved.getValue().getCountryCode()).isEqualTo("+91");
        assertThat(saved.getValue().getFingerprint()).hasSize(64);
        verify(notifications).notifyAdministrator(saved.getValue());
        verify(notifications).confirmApplicant(saved.getValue());
    }

    @Test
    void emptyMessageGetsOriginalPlaceholder() {
        ContactRequest r = new ContactRequest("A", "a@b.co", "+44", "020 7946 0958", "", "United Kingdom", "No", "  ", "");
        service.submit(r);

        ArgumentCaptor<ContactMessage> saved = ArgumentCaptor.forClass(ContactMessage.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getMessage()).isEqualTo("(No message provided)");
    }

    @Test
    void duplicateInsideWindowIsRejectedAndNotSaved() {
        when(repository.existsByFingerprintAndCreatedAtAfter(anyString(), any(LocalDateTime.class))).thenReturn(true);

        assertThatThrownBy(() -> service.submit(TestData.validRequest()))
                .isInstanceOf(DuplicateSubmissionException.class);
        verify(repository, never()).save(any());
        verify(notifications, never()).notifyAdministrator(any());
        verify(notifications, never()).confirmApplicant(any());
    }

    @Test
    void honeypotIsRejected() {
        ContactRequest r = new ContactRequest("A", "a@b.co", "+91", "9876543210", "", "India", "Yes", "hi", "http://spam");
        assertThatThrownBy(() -> service.submit(r)).isInstanceOf(SpamDetectedException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void valuesOutsideTheDropdownListsAreRejected() {
        ContactRequest r = new ContactRequest("A", "a@b.co", "+999", "9876543210", "", "Atlantis", "Maybe", "hi", "");
        assertThatThrownBy(() -> service.submit(r))
                .isInstanceOfSatisfying(RequestValidationException.class, e ->
                        assertThat(e.getFieldErrors()).containsKeys("countryCode", "country", "drone"));
        verify(repository, never()).save(any());
    }

    @Test
    void databaseFailurePropagatesAndNoEmailIsSent() {
        when(repository.save(any())).thenThrow(new DataAccessResourceFailureException("down"));

        assertThatThrownBy(() -> service.submit(TestData.validRequest()))
                .isInstanceOf(DataAccessResourceFailureException.class);
        verify(notifications, never()).notifyAdministrator(any());
    }

    @Test
    void fingerprintIgnoresCaseSpacingAndPhoneFormatting() {
        String a = ContactService.fingerprint("a@b.co", "+91", "98765 43210", "Hello  World");
        String b = ContactService.fingerprint("a@b.co", "+91", "9876543210", "hello world");
        String c = ContactService.fingerprint("a@b.co", "+91", "9876543210", "a different message");
        assertThat(a).isEqualTo(b).isNotEqualTo(c);
    }
}
