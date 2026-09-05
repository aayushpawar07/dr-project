package com.medexjob.repository;

import com.medexjob.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByEmailAndIsActiveTrue(String email);
    
    Optional<User> findByEmailIgnoreCaseAndIsActiveTrue(String email);
    
    Optional<User> findByEmailVerificationToken(String token);
    
    Optional<User> findByPasswordResetToken(String token);
    
    Optional<User> findByEmailAndOtp(String email, String otp);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.isActive = true")
    Optional<User> findActiveUserByEmail(@Param("email") String email);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.isActive = true")
    long countByRoleAndIsActiveTrue(@Param("role") User.UserRole role);
    
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.isActive = true")
    java.util.List<User> findByRoleAndIsActiveTrue(@Param("role") User.UserRole role);

    // Added to satisfy callers expecting a simple findByRole(User.UserRole)
    List<User> findByRole(User.UserRole role);
}










