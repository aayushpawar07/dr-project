package com.medexjob.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tracks unique daily visitors to the platform.
 * Each row = one unique visitorToken per day.
 */
@Entity
@Table(name = "visitor_logs", indexes = {
    @Index(name = "idx_visitor_token", columnList = "visitor_token"),
    @Index(name = "idx_visit_date", columnList = "visit_date")
})
public class VisitorLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** A browser-generated random UUID stored in localStorage to identify a unique visitor */
    @Column(name = "visitor_token", nullable = false, length = 64)
    private String visitorToken;

    /** IP address of the visitor (best-effort) */
    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    /** User-Agent string */
    @Column(name = "user_agent", length = 512)
    private String userAgent;

    /** The calendar date of this visit (for daily unique counting) */
    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    /** Number of page-view pings on this day for this token */
    @Column(name = "visit_count", nullable = false)
    private int visitCount = 1;

    /** First seen timestamp */
    @Column(name = "first_seen", nullable = false)
    private LocalDateTime firstSeen;

    /** Last updated timestamp */
    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    public VisitorLog() {}

    // Getters and setters

    public Long getId() { return id; }

    public String getVisitorToken() { return visitorToken; }
    public void setVisitorToken(String visitorToken) { this.visitorToken = visitorToken; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }

    public int getVisitCount() { return visitCount; }
    public void setVisitCount(int visitCount) { this.visitCount = visitCount; }

    public LocalDateTime getFirstSeen() { return firstSeen; }
    public void setFirstSeen(LocalDateTime firstSeen) { this.firstSeen = firstSeen; }

    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }
}
