package com.medexjob.service;

import com.medexjob.controller.EmployerController;
import com.medexjob.dto.RegisterRequest;
import com.medexjob.entity.Employer;
import com.medexjob.entity.User;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployerRegistrationIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private EmployerController employerController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployerRepository employerRepository;

    @Test
    void registeringEmployerCreatesUserAndEmployerProfile() {
        RegisterRequest request = new RegisterRequest(
                "Dr. John Doe",
                "john.doe.employer@hospital.com",
                "9876543210",
                "password123",
                User.UserRole.EMPLOYER,
                "Apex City Hospital",
                "HOSPITAL"
        );

        authService.register(request);

        Optional<User> userOpt = userRepository.findByEmail("john.doe.employer@hospital.com");
        assertThat(userOpt).isPresent();
        User user = userOpt.get();
        assertThat(user.getRole()).isEqualTo(User.UserRole.EMPLOYER);

        Optional<Employer> employerOpt = employerRepository.findByUserId(user.getId());
        assertThat(employerOpt).isPresent();
        Employer employer = employerOpt.get();
        assertThat(employer.getCompanyName()).isEqualTo("Apex City Hospital");
        assertThat(employer.getCompanyType()).isEqualTo(Employer.CompanyType.HOSPITAL);
        assertThat(employer.getVerificationStatus()).isEqualTo(Employer.VerificationStatus.PENDING);

        // Verify fetching by userId succeeds
        ResponseEntity<?> response = employerController.getEmployer(user.getId());
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("companyName")).isEqualTo("Apex City Hospital");
    }

    @Test
    void existingEmployerWithoutEmployerProfileAutoCreatesOnFetch() {
        User user = new User();
        user.setName("Dr. Legacy Employer");
        user.setEmail("legacy.employer@hospital.com");
        user.setPhone("9988776655");
        user.setRole(User.UserRole.EMPLOYER);
        user.setPasswordHash("hash123");
        user.setIsActive(true);
        user.setIsVerified(true);
        User savedUser = userRepository.save(user);

        // Verify no employer exists yet
        assertThat(employerRepository.findByUserId(savedUser.getId())).isEmpty();

        // Calling getEmployer with userId auto-creates and returns 200 OK instead of 404
        ResponseEntity<?> response = employerController.getEmployer(savedUser.getId());
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("companyName")).isEqualTo("Dr. Legacy Employer");

        // Verify it is now persisted in repository
        assertThat(employerRepository.findByUserId(savedUser.getId())).isPresent();
    }
}
