package com.hawkaero.contact.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hawkaero.contact.config.AppProperties;
import com.hawkaero.contact.contact.ContactMessage;
import com.hawkaero.contact.contact.ContactMessageRepository;
import com.hawkaero.contact.contact.NotificationStatus;
import jakarta.mail.Address;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class EmailNotificationServiceTest {

    private JavaMailSender sender;
    private ContactMessageRepository repository;
    private EmailNotificationService service;
    private ContactMessage message;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        repository = mock(ContactMessageRepository.class);
        when(sender.createMimeMessage()).thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        AppProperties props = new AppProperties(null, null, null, null,
                new AppProperties.Mail("smtp.test", "company@example.test", "sender@example.test", "Website Contact Form"),
                null);
        service = new EmailNotificationService(provider, repository, props);
        message = new ContactMessage("ref-1", "Asha Rao", "visitor@example.com", "98765 43210", "+91",
                "Hawk Farms", "India", "Yes", "Interested in a demo.", "f".repeat(64), LocalDateTime.now());
    }

    @Test
    void companyNotificationGoesToConfiguredRecipientOnly() throws Exception {
        assertThat(service.notifyAdministrator(message)).isEqualTo(NotificationStatus.SENT);

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        assertThat(sent.getValue().getRecipients(Message.RecipientType.TO)).hasSize(1);
        assertThat(sent.getValue().getRecipients(Message.RecipientType.TO)[0].toString())
                .isEqualTo("company@example.test");
    }

    @Test
    void confirmationGoesToTheVisitorAddressOnly() throws Exception {
        assertThat(service.confirmApplicant(message)).isEqualTo(NotificationStatus.SENT);

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        Address[] to = sent.getValue().getRecipients(Message.RecipientType.TO);
        assertThat(to).hasSize(1);
        assertThat(to[0].toString()).isEqualTo("visitor@example.com");
        assertThat(sent.getValue().getRecipients(Message.RecipientType.CC)).isNull();
        assertThat(sent.getValue().getRecipients(Message.RecipientType.BCC)).isNull();
        verify(repository).recordConfirmationAttempt(any(), eq(NotificationStatus.SENT), any(), eq(null));
    }

    @Test
    void failedConfirmationIsRecordedWithoutLeakingSmtpDetails() {
        doThrow(new MailSendException("535 bad credentials for user@secret")).when(sender).send(any(MimeMessage.class));

        assertThat(service.confirmApplicant(message)).isEqualTo(NotificationStatus.FAILED);

        ArgumentCaptor<String> error = ArgumentCaptor.forClass(String.class);
        verify(repository).recordConfirmationAttempt(any(), eq(NotificationStatus.FAILED), eq(null), error.capture());
        assertThat(error.getValue()).startsWith("MailSendException").doesNotContain("secret");
        verify(repository, never()).recordNotificationAttempt(any(), any(), any(), any());
    }
}
