package com.medexjob.service;

import com.medexjob.dto.LoginRequest;
import com.medexjob.dto.RegisterRequest;
import com.medexjob.dto.AuthResponse;
import com.medexjob.entity.User;
import com.medexjob.security.AuthException;
import com.medexjob.repository.UserRepository;
import com.medexjob.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private EmailService emailService;

    // ---------------- Register ----------------
    public void register(RegisterRequest registerRequest) {
        // Validate role
        if (registerRequest.getRole() == null) {
            throw new AuthException("User role must be specified.");
        }

        // Block ADMIN registration - admins can only be created by other admins
        if (registerRequest.getRole() == User.UserRole.ADMIN) {
            throw new AuthException("Admin registration is not allowed. Please contact system administrator.");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new AuthException("Email is already registered!");
        }

        // Create new user
        User user = new User();
        user.setName(registerRequest.getName());
        user.setEmail(registerRequest.getEmail());
        user.setPhone(registerRequest.getPhone());
        user.setRole(registerRequest.getRole());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));

        // ---------------- For Testing: skip email verification ----------------
        user.setIsActive(true);
        user.setIsVerified(true);

        // Optional: keep email verification token for later
        user.setEmailVerificationToken(UUID.randomUUID().toString());

        userRepository.save(user);

        // TODO: Send email verification email (for production)
    }

    // ---------------- Login ----------------
    public AuthResponse login(LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            String email = loginRequest.getEmail() != null ? loginRequest.getEmail().trim() : "";
            User user = userRepository.findByEmailIgnoreCaseAndIsActiveTrue(email)
                    .orElseGet(() -> userRepository.findByEmailAndIsActiveTrue(loginRequest.getEmail())
                            .orElseThrow(() -> new AuthException("User not found or inactive")));

            if (user.getRole() != User.UserRole.ADMIN && !Boolean.TRUE.equals(user.getIsVerified())) {
                throw new AuthException("Please verify your email before logging in.");
            }

            String token = jwtTokenProvider.generateToken(user.getEmail());

            return new AuthResponse(token, user);

        } catch (AuthenticationException e) {
            throw new AuthException("Invalid email or password");
        }
    }

    // ---------------- Get Current User ----------------
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new AuthException("User not found"));
    }

    // ---------------- Email Verification ----------------
    public boolean verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new AuthException("Invalid verification token"));

        user.setIsVerified(true);
        user.setEmailVerifiedAt(java.time.LocalDateTime.now());
        user.setEmailVerificationToken(null);

        userRepository.save(user);
        return true;
    }

    // ---------------- Forgot Password (OTP-based) ----------------
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new AuthException("User not found"));

        // Generate 6-digit OTP
        String otp = String.format("%06d", (int) (Math.random() * 1000000));

        // Set OTP and expiration (10 minutes)
        user.setOtp(otp);
        user.setOtpExpires(java.time.LocalDateTime.now().plusMinutes(10));

        userRepository.save(user);

        // Send OTP email — if sending fails, propagate the error to the caller.
        // The OTP is saved in the database, but we must inform the user that the email
        // could not be delivered so they know to retry.
        try {
            emailService.sendOtpEmail(email, otp);
        } catch (Exception e) {
            // Clear the OTP from the database so the failed attempt cannot be exploited
            user.setOtp(null);
            user.setOtpExpires(null);
            userRepository.save(user);
            throw new AuthException("Failed to send OTP email. Please check your email address and try again. " +
                    "If the problem persists, contact support. (" + e.getMessage() + ")");
        }
    }

    // ---------------- Verify OTP ----------------
    public boolean verifyOtp(String email, String otp) {
        User user = userRepository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new AuthException("User not found"));

        if (user.getOtp() == null || !user.getOtp().equals(otp)) {
            throw new AuthException("Invalid OTP");
        }

        if (user.getOtpExpires() == null || user.getOtpExpires().isBefore(java.time.LocalDateTime.now())) {
            throw new AuthException("OTP has expired. Please request a new one.");
        }

        // OTP is valid, keep it for password reset step
        return true;
    }

    // ---------------- Reset Password with OTP ----------------
    public boolean resetPasswordWithOtp(String email, String otp, String newPassword) {
        User user = userRepository.findByEmailAndOtp(email, otp)
                .orElseThrow(() -> new AuthException("Invalid email or OTP"));

        if (user.getOtpExpires() == null || user.getOtpExpires().isBefore(java.time.LocalDateTime.now())) {
            throw new AuthException("OTP has expired. Please request a new one.");
        }

        // Reset password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setOtp(null);
        user.setOtpExpires(null);

        userRepository.save(user);
        return true;
    }

    // ---------------- Reset Password (Legacy - token-based) ----------------
    public boolean resetPassword(String token, String newPassword) {
        User user = userRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new AuthException("Invalid reset token"));

        if (user.getPasswordResetExpires().isBefore(java.time.LocalDateTime.now())) {
            throw new AuthException("Reset token has expired");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpires(null);

        userRepository.save(user);
        return true;
    }
}
