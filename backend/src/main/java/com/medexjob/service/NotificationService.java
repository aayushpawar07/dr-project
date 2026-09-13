// AI assisted development
package com.medexjob.service;

import com.medexjob.entity.Notification;
import com.medexjob.entity.NotificationPreferences;
import com.medexjob.repository.NotificationRepository;
import com.medexjob.repository.NotificationPreferencesRepository;
import com.medexjob.repository.UserRepository;
import com.medexjob.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationPreferencesRepository preferencesRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Check if user has enabled this type of notification
     */
    private boolean shouldNotify(UUID userId, String notificationType) {
        Optional<NotificationPreferences> prefsOpt = preferencesRepository.findByUserId(userId);

        if (prefsOpt.isEmpty()) {
            // Default: allow all notifications if preferences not set
            return true;
        }

        NotificationPreferences prefs = prefsOpt.get();

        switch (notificationType) {
            case "application_update":
                return prefs.getApplicationUpdateEnabled();
            case "interview_scheduled":
                return prefs.getInterviewScheduledEnabled();
            case "job_alert":
                return prefs.getJobAlertEnabled();
            case "subscription":
                return prefs.getSubscriptionEnabled();
            case "application_received":
                // Employer notifications - always enabled by default
                return true;
            default:
                return true;
        }
    }

    /**
     * Notify candidate about application status update
     */
    public void notifyCandidateApplicationStatus(UUID candidateId, String jobTitle,
            String status, UUID jobId, UUID applicationId) {
        if (candidateId == null) {
            logger.warn("⚠️ Cannot notify: candidateId is null");
            return;
        }

        if (!shouldNotify(candidateId, "application_update")) {
            logger.debug("Notification disabled for candidate: {}", candidateId);
            return;
        }

        try {
            String message = "";
            String notificationType = "application_update";

            switch (status.toUpperCase()) {
                case "SHORTLISTED":
                    message = String.format(
                            "Your application for '%s' was updated to shortlisted.",
                            jobTitle);
                    break;
                case "SELECTED":
                case "HIRED":
                    message = String.format(
                            "Your application for '%s' was updated to hired.",
                            jobTitle);
                    break;
                case "REJECTED":
                    message = String.format(
                            "Your application for '%s' was updated to rejected.",
                            jobTitle);
                    break;
                case "INTERVIEW":
                    message = String.format(
                            "Your application for '%s' was updated to interview.",
                            jobTitle);
                    break;
                case "APPLIED":
                case "PENDING":
                    message = String.format(
                            "Your application for '%s' was updated to pending.",
                            jobTitle);
                    break;
                default:
                    message = String.format(
                            "Your application for '%s' was updated to %s.",
                            jobTitle,
                            status.toLowerCase());
            }

            String title = "Application Status Update";
            Notification notification = new Notification(candidateId, notificationType, title, message);
            if (jobId != null)
                notification.setRelatedJobId(jobId);
            if (applicationId != null)
                notification.setRelatedApplicationId(applicationId);

            notificationRepository.save(notification);
            logger.info("🔔 Notification sent to candidate: {} for application status: {}", candidateId, status);
        } catch (Exception e) {
            logger.error("❌ Error creating notification for candidate: {}", e.getMessage(), e);
        }
    }

    /**
     * Notify candidate about interview scheduled (with meeting link and notes)
     */
    public void notifyCandidateInterviewScheduled(UUID candidateId, String jobTitle,
            String interviewDate, String meetingLink, String notes, UUID jobId, UUID applicationId) {
        if (candidateId == null) {
            logger.warn("⚠️ Cannot notify: candidateId is null");
            return;
        }

        if (!shouldNotify(candidateId, "interview_scheduled")) {
            logger.debug("Interview notification disabled for candidate: {}", candidateId);
            return;
        }

        try {
            StringBuilder message = new StringBuilder();
            message.append(String.format("📅 Interview scheduled for '%s' on %s.", jobTitle, interviewDate != null ? interviewDate : "TBD"));
            if (meetingLink != null && !meetingLink.isBlank()) {
                message.append(" Meeting link: ").append(meetingLink.trim()).append(".");
            }
            if (notes != null && !notes.isBlank()) {
                message.append(" Note: ").append(notes.trim());
            }

            // Truncate to 500 chars if exceeds DB column size
            String finalMsg = message.toString();
            if (finalMsg.length() > 500) {
                finalMsg = finalMsg.substring(0, 497) + "...";
            }

            String title = "Interview Scheduled";
            Notification notification = new Notification(candidateId, "interview_scheduled", title, finalMsg);
            if (jobId != null)
                notification.setRelatedJobId(jobId);
            if (applicationId != null)
                notification.setRelatedApplicationId(applicationId);

            notificationRepository.save(notification);
            logger.info("🔔 Interview notification sent to candidate: {} (job: {})", candidateId, jobTitle);
        } catch (Exception e) {
            logger.error("❌ Error creating interview notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Legacy overload for backwards compatibility
     */
    public void notifyCandidateInterviewScheduled(UUID candidateId, String jobTitle,
            String interviewDate, UUID jobId, UUID applicationId) {
        notifyCandidateInterviewScheduled(candidateId, jobTitle, interviewDate, null, null, jobId, applicationId);
    }

    /**
     * Notify employer about job approval/rejection
     */
    public void notifyEmployerJobStatus(UUID employerUserId, String jobTitle,
            String status, UUID jobId) {
        if (employerUserId == null) {
            logger.warn("⚠️ Cannot notify: employerUserId is null");
            return;
        }

        try {
            String message = "";
            String notificationType = "job_alert";

            switch (status.toUpperCase()) {
                case "ACTIVE":
                    message = String.format(
                            "✅ Your job '%s' has been approved and is now live!",
                            jobTitle);
                    break;
                case "REJECTED":
                case "CLOSED":
                    message = String.format(
                            "Your job '%s' status has been updated to %s",
                            jobTitle,
                            status);
                    break;
                case "PENDING":
                    message = String.format(
                            "Your job '%s' is pending admin approval",
                            jobTitle);
                    break;
                default:
                    message = String.format(
                            "Your job '%s' status has been updated",
                            jobTitle);
            }

            String title = "Job Status Update";
            Notification notification = new Notification(employerUserId, notificationType, title, message);
            if (jobId != null)
                notification.setRelatedJobId(jobId);

            notificationRepository.save(notification);
            logger.info("🔔 Job status notification sent to employer: {}", employerUserId);
        } catch (Exception e) {
            logger.error("❌ Error creating job status notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Notify employer about subscription
     */
    public void notifyEmployerSubscription(UUID employerUserId, String planName,
            String event, UUID subscriptionId) {
        if (employerUserId == null) {
            logger.warn("⚠️ Cannot notify: employerUserId is null");
            return;
        }

        if (!shouldNotify(employerUserId, "subscription")) {
            logger.debug("Subscription notification disabled for employer: {}", employerUserId);
            return;
        }

        try {
            String message = "";
            String notificationType = "subscription";

            switch (event.toLowerCase()) {
                case "activated":
                case "purchased":
                    message = String.format(
                            "✅ Your subscription plan '%s' has been activated!",
                            planName);
                    break;
                case "expiring":
                    message = String.format(
                            "⚠️ Your subscription plan '%s' is expiring soon. Please renew to continue posting jobs.",
                            planName);
                    break;
                case "expired":
                    message = String.format(
                            "❌ Your subscription plan '%s' has expired. Please renew to continue posting jobs.",
                            planName);
                    break;
                case "cancelled":
                    message = String.format(
                            "Your subscription plan '%s' has been cancelled.",
                            planName);
                    break;
                default:
                    message = String.format(
                            "Subscription update for plan '%s'",
                            planName);
            }

            String title = "Subscription Update";
            Notification notification = new Notification(employerUserId, notificationType, title, message);
            notificationRepository.save(notification);
            logger.info("🔔 Subscription notification sent to employer: {}", employerUserId);
        } catch (Exception e) {
            logger.error("❌ Error creating subscription notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Notify admin about pending approvals
     */
    public void notifyAdminPendingApproval(String type, String message, UUID relatedId) {
        try {
            List<User> admins = userRepository.findByRole(User.UserRole.ADMIN);

            String title = "Pending Approval";
            for (User admin : admins) {
                Notification notification = new Notification(admin.getId(), type, title, message);
                if (relatedId != null) {
                    if (type.contains("job")) {
                        notification.setRelatedJobId(relatedId);
                    } else if (type.contains("employer")) {
                        // For employer verification, we can use a custom field or just message
                    }
                }
                notificationRepository.save(notification);
            }

            logger.info("🔔 Admin notifications sent to {} admins", admins.size());
        } catch (Exception e) {
            logger.error("❌ Error creating admin notifications: {}", e.getMessage(), e);
        }
    }

    /**
     * Notify employer about new application (existing - kept for reference)
     */
    public void notifyEmployerApplicationReceived(UUID employerUserId, String jobTitle,
            String candidateName, String candidateEmail,
            UUID jobId, UUID applicationId) {
        if (employerUserId == null) {
            logger.warn("⚠️ Cannot notify: employerUserId is null");
            return;
        }

        try {
            String message = String.format(
                    "New application received for job: %s from %s (%s)",
                    jobTitle,
                    candidateName,
                    candidateEmail);

            String title = "New Application Received";
            Notification notification = new Notification(
                    employerUserId,
                    "application_received",
                    title,
                    message);
            notification.setRelatedJobId(jobId);
            notification.setRelatedApplicationId(applicationId);

            notificationRepository.save(notification);
            logger.info("🔔 Application notification sent to employer: {}", employerUserId);
        } catch (Exception e) {
            logger.error("❌ Error creating application notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Notify candidate about application submission confirmation
     */
    public void notifyCandidateApplicationSubmitted(UUID candidateId, String jobTitle,
            UUID jobId, UUID applicationId) {
        if (candidateId == null) {
            return;
        }

        if (!shouldNotify(candidateId, "application_update")) {
            return;
        }

        try {
            String message = String.format(
                    "✅ Your application for '%s' has been submitted successfully!",
                    jobTitle);

            String title = "Application Submitted";
            Notification notification = new Notification(
                    candidateId,
                    "application_update",
                    title,
                    message);
            notification.setRelatedJobId(jobId);
            notification.setRelatedApplicationId(applicationId);

            notificationRepository.save(notification);
            logger.info("🔔 Application submission confirmation sent to candidate: {}", candidateId);
        } catch (Exception e) {
            logger.error("❌ Error creating application submission notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Notify employer about verification status change
     */
    public void notifyEmployerVerification(UUID employerUserId, String companyName,
            String status, UUID employerId) {
        if (employerUserId == null) {
            logger.warn("⚠️ Cannot notify: employerUserId is null");
            return;
        }

        try {
            String message = "";
            String title = "";
            String notificationType = "employer_verification";

            switch (status.toUpperCase()) {
                case "APPROVED":
                    title = "Employer Account Approved";
                    message = String.format(
                            "✅ Your employer account for '%s' has been verified and approved!",
                            companyName);
                    break;
                case "REJECTED":
                    title = "Employer Account Rejected";
                    message = String.format(
                            "Your employer account for '%s' verification has been rejected. Please contact support.",
                            companyName);
                    break;
                case "PENDING":
                    title = "Employer Verification Pending";
                    message = String.format(
                            "Your employer account for '%s' verification is pending review.",
                            companyName);
                    break;
                default:
                    title = "Employer Verification Update";
                    message = String.format(
                            "Your employer account for '%s' verification status has been updated.",
                            companyName);
            }

            Notification notification = new Notification(employerUserId, notificationType, title, message);
            notificationRepository.save(notification);
            logger.info("🔔 Verification notification sent to employer: {}", employerUserId);
        } catch (Exception e) {
            logger.error("❌ Error creating verification notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Generic method to create a notification
     * Used for employer status changes (discontinue/continue)
     */
    public void createNotification(UUID userId, String title, String message, String type, String relatedId) {
        if (userId == null) {
            logger.warn("⚠️ Cannot create notification: userId is null");
            return;
        }

        try {
            Notification notification = new Notification(userId, type, title, message);
            notificationRepository.save(notification);
            logger.info("🔔 Notification created for user: {} - type: {}", userId, type);
        } catch (Exception e) {
            logger.error("❌ Error creating notification: {}", e.getMessage(), e);
        }
    }
}
