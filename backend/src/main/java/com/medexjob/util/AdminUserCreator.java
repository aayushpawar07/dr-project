package com.medexjob.util;

import com.medexjob.entity.User;
import com.medexjob.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Optional one-time admin bootstrap. Disabled by default.
 * Production credentials must be supplied through the deployment environment,
 * never committed to source control or written to logs.
 */
@Component
public class AdminUserCreator implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(AdminUserCreator.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${medex.admin-bootstrap.enabled:false}")
    private boolean enabled;

    @Value("${medex.admin-bootstrap.name:}")
    private String adminName;

    @Value("${medex.admin-bootstrap.email:}")
    private String adminEmail;

    @Value("${medex.admin-bootstrap.phone:}")
    private String adminPhone;

    @Value("${medex.admin-bootstrap.password:}")
    private String adminPassword;

    public AdminUserCreator(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        validateBootstrapConfiguration();
        createAdminUser();
    }

    private void validateBootstrapConfiguration() {
        if (isBlank(adminName) || isBlank(adminEmail) || isBlank(adminPhone) || isBlank(adminPassword)) {
            throw new IllegalStateException(
                    "Admin bootstrap is enabled but ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMAIL, " +
                    "ADMIN_BOOTSTRAP_PHONE, or ADMIN_BOOTSTRAP_PASSWORD is missing");
        }
        if (adminPassword.length() < 6) {
            throw new IllegalStateException("ADMIN_BOOTSTRAP_PASSWORD must be at least 6 characters");
        }
    }

    private void createAdminUser() {
        String email = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            logger.info("Admin bootstrap skipped because the configured admin account already exists");
            return;
        }

        User adminUser = new User();
        adminUser.setName(adminName.trim());
        adminUser.setEmail(email);
        adminUser.setPhone(adminPhone.trim());
        adminUser.setRole(User.UserRole.ADMIN);
        adminUser.setPasswordHash(passwordEncoder.encode(adminPassword));
        adminUser.setIsActive(true);
        adminUser.setIsVerified(true);
        adminUser.setEmailVerificationToken(UUID.randomUUID().toString());
        adminUser.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(adminUser);

        logger.warn("Admin bootstrap created the configured admin account. Disable ADMIN_BOOTSTRAP_ENABLED after first use.");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
