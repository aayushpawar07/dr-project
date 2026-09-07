package com.medexjob.service;

import java.io.IOException;
import com.medexjob.entity.User;
import com.medexjob.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Note: The 'username' parameter here is the email extracted from the JWT 'sub' claim.
        String trimmed = username != null ? username.trim() : "";
        User user = userRepository.findByEmailIgnoreCaseAndIsActiveTrue(trimmed)
            .orElseGet(() -> userRepository.findByEmailAndIsActiveTrue(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username)));

        // Admins are exempt from email verification; other users must have isVerified == true
        if (user.getRole() != User.UserRole.ADMIN && !Boolean.TRUE.equals(user.getIsVerified())) {
            throw new UsernameNotFoundException("User email not verified: " + username);
        }

        List<SimpleGrantedAuthority> authorities = Collections.singletonList(
            new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );

        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPasswordHash(),
            authorities
        );
    }
}