// AI assisted development
package com.medexjob.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    /**
     * The "from" address for outgoing emails.
     * Reads SPRING_MAIL_FROM env var first, then falls back to the configured
     * spring.mail.username (the SMTP account), then a default.
     */
    @Value("${spring.mail.from:${spring.mail.username:noreply@medexjob.com}}")
    private String fromAddress;

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            logger.info("═══════════════════════════════════════════════════════");
            logger.info("Attempting to send OTP email to: {}", toEmail);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject("Password Reset OTP - MedExJob.com");
            message.setText(
                    "Hello,\n\n" +
                    "You have requested to reset your password for your MedExJob.com account.\n\n" +
                    "Your OTP (One-Time Password) is: " + otp + "\n\n" +
                    "This OTP will expire in 10 minutes.\n\n" +
                    "If you did not request this password reset, please ignore this email.\n\n" +
                    "Best regards,\n" +
                    "MedExJob.com Team");

            logger.info("Sending OTP email via SMTP from: {}", fromAddress);
            mailSender.send(message);
            logger.info("✅ OTP email sent successfully to: {}", toEmail);
            logger.info("═══════════════════════════════════════════════════════");

        } catch (org.springframework.mail.MailAuthenticationException e) {
            logger.error("❌ Email authentication failed! Check SMTP credentials.");
            logger.error("  Host: smtp.gmail.com:587");
            logger.error("  Username: (configured via spring.mail.username)");
            logger.error("  Error: {}", e.getMessage());
            logger.error("  Ensure Gmail 2-Step Verification is enabled and an App Password is used.");
            throw new RuntimeException("Email authentication failed. Please check SMTP configuration.", e);
        } catch (org.springframework.mail.MailSendException e) {
            logger.error("❌ Failed to send email to: {}", toEmail);
            logger.error("  Error: {}", e.getMessage());
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("❌ Unexpected error sending OTP email to: {}", toEmail);
            logger.error("  Error: {}", e.getMessage());
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage(), e);
        }
    }
}
