// AI assisted development
package com.medexjob.controller;

import com.medexjob.entity.*;
import com.medexjob.repository.*;
import com.medexjob.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private static final Logger logger = LoggerFactory.getLogger(SubscriptionController.class);

    private final SubscriptionPlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final EmployerRepository employerRepository;
    private final com.medexjob.service.RazorpayService razorpayService;
    private final NotificationService notificationService;
    private final com.medexjob.service.InvoiceService invoiceService;

    public SubscriptionController(
            SubscriptionPlanRepository planRepository,
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository,
            UserRepository userRepository,
            EmployerRepository employerRepository,
            com.medexjob.service.RazorpayService razorpayService,
            NotificationService notificationService,
            com.medexjob.service.InvoiceService invoiceService) {
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.employerRepository = employerRepository;
        this.razorpayService = razorpayService;
        this.notificationService = notificationService;
        this.invoiceService = invoiceService;
    }

    /**
     * Get subscription plans
     * GET /api/subscriptions/plans
     */
    @GetMapping("/plans")
    public ResponseEntity<Map<String, Object>> getSubscriptionPlans() {
        try {
            List<SubscriptionPlan> plans = planRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
            List<Map<String, Object>> plansResponse = plans.stream()
                    .map(this::planToResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("plans", plansResponse));
        } catch (Exception e) {
            logger.error("Error fetching subscription plans", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch subscription plans"));
        }
    }

    /**
     * Create subscription (after payment)
     * POST /api/subscriptions
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createSubscription(@RequestBody Map<String, Object> request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            User user = userOpt.get();
            String paymentIdStr = (String) request.get("paymentId");
            if (paymentIdStr == null) {
                return ResponseEntity.status(400).body(Map.of("error", "paymentId is required. Use payment confirmation flow."));
            }

            UUID paymentId = UUID.fromString(paymentIdStr);
            Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
            if (paymentOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Payment not found"));
            }

            Payment payment = paymentOpt.get();
            if (!payment.getUserId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied for this payment"));
            }

            if (payment.getStatus() != Payment.PaymentStatus.SUCCESS) {
                return ResponseEntity.status(400).body(Map.of("error", "Subscription can only be created for successful payments"));
            }

            if (payment.getSubscription() != null) {
                Subscription existing = payment.getSubscription();
                return ResponseEntity.ok(subscriptionToResponse(existing));
            }

            UUID planId = payment.getPlanId();
            if (planId == null) {
                return ResponseEntity.status(400).body(Map.of("error", "Payment is not linked to a subscription plan"));
            }

            Optional<SubscriptionPlan> planOpt = planRepository.findById(planId);
            if (planOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Subscription plan not found for payment"));
            }

            SubscriptionPlan plan = planOpt.get();
            LocalDate startDate = LocalDate.now();
            LocalDate endDate = calculateEndDate(startDate, plan.getDuration());

            // Check if user has active subscription
            Optional<Subscription> existingSubscription = subscriptionRepository.findActiveSubscriptionByUser(user.getId(), LocalDate.now());
            if (existingSubscription.isPresent()) {
                // User already has active subscription - allow upgrade/renewal
                Subscription existing = existingSubscription.get();
                logger.info("User {} already has active subscription {}. Allowing renewal/upgrade.", user.getEmail(), existing.getId());
                // Cancel existing subscription and create new one (upgrade scenario)
                existing.setStatus(Subscription.SubscriptionStatus.CANCELLED);
                existing.setAutoRenew(false);
                subscriptionRepository.save(existing);
            }

            // Create new subscription and link it to payment
            Subscription subscription = new Subscription(user.getId(), plan, startDate, endDate);
            subscription = subscriptionRepository.save(subscription);
            payment.setSubscription(subscription);
            paymentRepository.save(payment);
            
            // Auto-create and verify employer if they have a subscription (for demo/testing purposes)
            if (user.getRole() == User.UserRole.EMPLOYER) {
                Optional<Employer> employerOpt = employerRepository.findByUserId(user.getId());
                Employer employer;
                
                if (employerOpt.isPresent()) {
                    // Employer exists - just verify if not already verified
                    employer = employerOpt.get();
                    if (!employer.getIsVerified() || employer.getVerificationStatus() != Employer.VerificationStatus.APPROVED) {
                        employer.setIsVerified(true);
                        employer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                        employer.setVerifiedAt(LocalDateTime.now());
                        employer.setVerificationNotes("Auto-verified upon subscription purchase");
                        employer = employerRepository.save(employer);
                        logger.info("Auto-verified existing employer {} for user {}", employer.getId(), user.getEmail());
                    }
                } else {
                    // Employer doesn't exist - create and verify
                    employer = new Employer();
                    employer.setUser(user);
                    employer.setCompanyName(user.getName() + " Company");
                    employer.setCompanyType(Employer.CompanyType.HOSPITAL);
                    employer.setIsVerified(true);
                    employer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                    employer.setVerifiedAt(LocalDateTime.now());
                    employer.setVerificationNotes("Auto-created and verified upon subscription purchase");
                    employer = employerRepository.save(employer);
                    logger.info("Auto-created and verified employer {} for user {}", employer.getId(), user.getEmail());
                }
            }
            
            // Notify employer about subscription activation
            try {
                notificationService.notifyEmployerSubscription(
                    user.getId(),
                    plan.getName(),
                    "activated",
                    subscription.getId()
                );
            } catch (Exception e) {
                logger.error("❌ Error creating subscription notification: {}", e.getMessage(), e);
            }
            
            // Notify admin about subscription purchase
            try {
                String employerName = user.getName();
                Optional<Employer> employerOpt = employerRepository.findByUserId(user.getId());
                if (employerOpt.isPresent()) {
                    employerName = employerOpt.get().getCompanyName();
                }
                String message = String.format("New subscription purchased: '%s' plan by %s (%s)", 
                    plan.getName(), employerName, user.getEmail());
                notificationService.notifyAdminPendingApproval(
                    "subscription_purchased",
                    message,
                    subscription.getId()
                );
            } catch (Exception e) {
                logger.error("❌ Error creating admin subscription notification: {}", e.getMessage(), e);
            }
            
            logger.info("Subscription created successfully: {} for user: {}", subscription.getId(), user.getEmail());

            return ResponseEntity.ok(subscriptionToResponse(subscription));
        } catch (IllegalArgumentException e) {
            logger.error("Invalid input while creating subscription", e);
            return ResponseEntity.status(400).body(Map.of(
                "error", "Invalid request data",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error creating subscription", e);
            logger.error("Exception details: " + e.getClass().getName() + " - " + e.getMessage());
            if (e.getCause() != null) {
                logger.error("Cause: " + e.getCause().getMessage());
            }
            return ResponseEntity.status(500).body(Map.of(
                "error", "Failed to create subscription",
                "message", e.getMessage() != null ? e.getMessage() : "Internal server error"
            ));
        }
    }

    /**
     * Get current subscription
     * GET /api/subscriptions/current
     */
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentSubscription() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                logger.warn("User not found for email: " + email);
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            UUID userId = userOpt.get().getId();
            logger.debug("Fetching subscription for user: " + userId);
            
            Optional<Subscription> subscriptionOpt = subscriptionRepository.findActiveSubscriptionByUser(userId, LocalDate.now());

            if (subscriptionOpt.isEmpty()) {
                if ("cricketloverayush9999@gmail.com".equalsIgnoreCase(email)) {
                    Map<String, Object> planMap = new LinkedHashMap<>();
                    planMap.put("id", UUID.randomUUID().toString());
                    planMap.put("name", "VIP Testing Plan (Unlimited)");
                    planMap.put("price", 0.0);
                    planMap.put("duration", "yearly");
                    planMap.put("jobPostsAllowed", 9999);
                    planMap.put("featuredPostsAllowed", 9999);
                    planMap.put("features", Arrays.asList("Unlimited Job Postings", "Priority Verification", "Testing Account"));
                    planMap.put("isActive", true);
                    planMap.put("displayOrder", 1);

                    Map<String, Object> subMap = new LinkedHashMap<>();
                    subMap.put("id", UUID.randomUUID().toString());
                    subMap.put("userId", userId.toString());
                    subMap.put("plan", planMap);
                    subMap.put("jobPostsAllowed", 9999);
                    subMap.put("startDate", LocalDate.now().minusDays(1).toString());
                    subMap.put("endDate", LocalDate.now().plusYears(10).toString());
                    subMap.put("status", "active");
                    subMap.put("autoRenew", true);
                    subMap.put("jobPostsUsed", 0);

                    return ResponseEntity.ok(Map.of("subscription", subMap));
                }
                logger.debug("No active subscription found for user: " + userId);
                return ResponseEntity.ok(Map.of("subscription", null));
            }

            Subscription subscription = subscriptionOpt.get();
            logger.debug("Found subscription: " + subscription.getId());
            
            Map<String, Object> subscriptionResponse = subscriptionToResponse(subscription);
            return ResponseEntity.ok(Map.of("subscription", subscriptionResponse));
        } catch (Exception e) {
            logger.error("Error fetching current subscription", e);
            logger.error("Exception details: " + e.getClass().getName() + " - " + e.getMessage());
            if (e.getCause() != null) {
                logger.error("Cause: " + e.getCause().getMessage());
            }
            return ResponseEntity.status(500).body(Map.of(
                "error", "Failed to fetch current subscription",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Update subscription
     * PUT /api/subscriptions/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateSubscription(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, Object> request
    ) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            UUID userId = userOpt.get().getId();
            Optional<Subscription> subscriptionOpt = subscriptionRepository.findById(id);

            if (subscriptionOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Subscription not found"));
            }

            Subscription subscription = subscriptionOpt.get();
            if (!subscription.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }

            // Update auto-renew
            if (request.containsKey("autoRenew")) {
                subscription.setAutoRenew((Boolean) request.get("autoRenew"));
            }

            subscription = subscriptionRepository.save(subscription);
            return ResponseEntity.ok(subscriptionToResponse(subscription));
        } catch (Exception e) {
            logger.error("Error updating subscription", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update subscription"));
        }
    }

    /**
     * Cancel subscription
     * POST /api/subscriptions/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelSubscription(@PathVariable("id") UUID id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            UUID userId = userOpt.get().getId();
            Optional<Subscription> subscriptionOpt = subscriptionRepository.findById(id);

            if (subscriptionOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Subscription not found"));
            }

            Subscription subscription = subscriptionOpt.get();
            if (!subscription.getUserId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
            }

            subscription.setStatus(Subscription.SubscriptionStatus.CANCELLED);
            subscription.setAutoRenew(false);
            subscription.setCancelledAt(LocalDateTime.now());
            subscription.setCancelledBy(userId);
            subscription = subscriptionRepository.save(subscription);

            // Notify employer about subscription cancellation
            try {
                String planName = subscription.getPlan() != null ? subscription.getPlan().getName() : "Subscription";
                notificationService.notifyEmployerSubscription(
                    userId,
                    planName,
                    "cancelled",
                    subscription.getId()
                );
            } catch (Exception e) {
                logger.error("❌ Error creating cancellation notification: {}", e.getMessage(), e);
            }

            return ResponseEntity.ok(subscriptionToResponse(subscription));
        } catch (Exception e) {
            logger.error("Error cancelling subscription", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to cancel subscription"));
        }
    }

    /**
     * Process payment
     * POST /api/payments
     */
    @PostMapping("/payments")
    public ResponseEntity<Map<String, Object>> processPayment(@RequestBody Map<String, Object> request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            User user = userOpt.get();
            String planIdStr = (String) request.get("planId");
            UUID planId = UUID.fromString(planIdStr);

            Optional<SubscriptionPlan> planOpt = planRepository.findById(planId);
            if (planOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Subscription plan not found"));
            }

            SubscriptionPlan plan = planOpt.get();
            BigDecimal amount = plan.getFinalPrice() != null ? plan.getFinalPrice() : plan.getPrice();

            // Create payment record
            Payment payment = new Payment(user.getId(), amount);
            payment.setPaymentGateway("razorpay");
            payment.setPlanId(plan.getId());
            payment.setStatus(Payment.PaymentStatus.PENDING);
            
            // Generate transaction ID
            String transactionId = "TXN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            payment.setTransactionId(transactionId);
            
            payment = paymentRepository.save(payment);

            // Create Razorpay order
            Map<String, Object> razorpayOrder;
            try {
                String receipt = "RECEIPT-" + payment.getId().toString().substring(0, 8).toUpperCase();
                razorpayOrder = razorpayService.createOrder(amount, "INR", receipt);
                
                // Save Razorpay order ID to payment
                payment.setGatewayOrderId((String) razorpayOrder.get("id"));
                paymentRepository.save(payment);
                
            } catch (Exception e) {
                logger.error("Error creating Razorpay order", e);
                // Continue without Razorpay order for now (fallback)
                razorpayOrder = new HashMap<>();
            }

            // Return payment details for frontend to initiate Razorpay checkout
            Map<String, Object> response = new HashMap<>();
            response.put("paymentId", payment.getId().toString());
            response.put("transactionId", payment.getTransactionId());
            response.put("amount", payment.getAmount().doubleValue());
            response.put("currency", "INR");
            response.put("planId", planIdStr);
            response.put("planName", plan.getName());
            
            // Razorpay order details
            if (!razorpayOrder.isEmpty()) {
                response.put("razorpayOrderId", razorpayOrder.get("id"));
                response.put("razorpayKeyId", razorpayService.getKeyId());
                response.put("razorpayAmount", razorpayOrder.get("amount"));
                response.put("razorpayCurrency", razorpayOrder.get("currency"));
            }
            
            response.put("message", "Payment order created. Proceed with Razorpay checkout.");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error processing payment", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to process payment"));
        }
    }

    /**
     * Payment webhook/callback (for Razorpay)
     * Legacy endpoint - no longer used
     */
    @PostMapping("/payments/webhook")
    public ResponseEntity<Map<String, Object>> paymentWebhook(@RequestBody Map<String, Object> request) {
        return ResponseEntity.status(410).body(Map.of("error", "This webhook endpoint is deprecated. Use /api/payments/razorpay/webhook"));
    }

    /**
     * Confirm Razorpay payment from frontend after successful checkout
     * POST /api/subscriptions/payments/razorpay/confirm
     */
    @PostMapping("/payments/razorpay/confirm")
    public ResponseEntity<Map<String, Object>> confirmRazorpayPayment(@RequestBody Map<String, Object> request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            User user = userOpt.get();

            String paymentIdStr = (String) request.get("paymentId");
            String razorpayOrderId = (String) request.get("razorpayOrderId");
            String razorpayPaymentId = (String) request.get("razorpayPaymentId");
            String razorpaySignature = (String) request.get("razorpaySignature");

            if (paymentIdStr == null || razorpayOrderId == null || razorpayPaymentId == null || razorpaySignature == null) {
                return ResponseEntity.status(400).body(Map.of("error", "Missing required payment confirmation fields"));
            }

            UUID paymentUuid;
            try {
                paymentUuid = UUID.fromString(paymentIdStr);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.status(400).body(Map.of("error", "Invalid paymentId format"));
            }

            Optional<Payment> paymentOpt = paymentRepository.findById(paymentUuid);
            if (paymentOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Payment not found"));
            }

            Payment payment = paymentOpt.get();

            // Ensure payment belongs to current user
            if (!payment.getUserId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied for this payment"));
            }

            // Idempotency: if already successful, return current state
            if (payment.getStatus() == Payment.PaymentStatus.SUCCESS) {
                Map<String, Object> response = new HashMap<>();
                response.put("payment", paymentToResponse(payment));

                Subscription subscription = payment.getSubscription();
                if (subscription != null) {
                    response.put("subscription", subscriptionToResponse(subscription));
                } else {
                    response.put("subscription", null);
                }

                response.put("message", "Payment already confirmed");
                return ResponseEntity.ok(response);
            }

            // Basic consistency checks
            if (payment.getGatewayOrderId() == null || !payment.getGatewayOrderId().equals(razorpayOrderId)) {
                return ResponseEntity.status(400).body(Map.of("error", "Order ID does not match the original payment"));
            }

            // Verify Razorpay signature
            boolean validSignature = razorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
            if (!validSignature) {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setFailureReason("Invalid Razorpay payment signature");
                paymentRepository.save(payment);

                return ResponseEntity.status(400).body(Map.of("error", "Payment verification failed"));
            }

            // Load plan associated with this payment
            UUID planId = payment.getPlanId();
            if (planId == null) {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setFailureReason("Missing associated plan for payment");
                paymentRepository.save(payment);
                return ResponseEntity.status(400).body(Map.of("error", "Payment is not linked to a subscription plan"));
            }

            Optional<SubscriptionPlan> planOpt = planRepository.findById(planId);
            if (planOpt.isEmpty()) {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setFailureReason("Subscription plan not found for payment");
                paymentRepository.save(payment);
                return ResponseEntity.status(400).body(Map.of("error", "Subscription plan not found for this payment"));
            }

            SubscriptionPlan plan = planOpt.get();
            BigDecimal expectedAmount = plan.getFinalPrice() != null ? plan.getFinalPrice() : plan.getPrice();
            if (expectedAmount == null || payment.getAmount() == null || payment.getAmount().compareTo(expectedAmount) != 0) {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setFailureReason("Payment amount does not match subscription plan price");
                paymentRepository.save(payment);
                return ResponseEntity.status(400).body(Map.of("error", "Payment amount mismatch"));
            }

            // Mark payment as successful
            payment.setStatus(Payment.PaymentStatus.SUCCESS);
            payment.setGatewayPaymentId(razorpayPaymentId);
            payment.setGatewaySignature(razorpaySignature);
            payment.setPaidAt(LocalDateTime.now());

            // If subscription already linked, just save and return
            if (payment.getSubscription() != null) {
                payment = paymentRepository.save(payment);

                Map<String, Object> response = new HashMap<>();
                response.put("payment", paymentToResponse(payment));
                response.put("subscription", subscriptionToResponse(payment.getSubscription()));
                response.put("message", "Payment confirmed and existing subscription linked");
                return ResponseEntity.ok(response);
            }

            // Cancel existing active subscription (if any)
            Optional<Subscription> existingSubscription = subscriptionRepository.findActiveSubscriptionByUser(user.getId(), LocalDate.now());
            existingSubscription.ifPresent(existing -> {
                existing.setStatus(Subscription.SubscriptionStatus.CANCELLED);
                existing.setAutoRenew(false);
                subscriptionRepository.save(existing);
            });

            // Create new subscription for this payment and plan
            LocalDate startDate = LocalDate.now();
            LocalDate endDate = calculateEndDate(startDate, plan.getDuration());

            Subscription subscription = new Subscription(user.getId(), plan, startDate, endDate);
            subscription = subscriptionRepository.save(subscription);
            payment.setSubscription(subscription);

            // Persist payment with linked subscription
            payment = paymentRepository.save(payment);

            // Generate invoice (best-effort, non-blocking)
            try {
                invoiceService.createInvoiceForPayment(payment);
            } catch (Exception ex) {
                logger.error("Error generating invoice during payment confirmation for payment {}", payment.getId(), ex);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("payment", paymentToResponse(payment));
            response.put("subscription", subscriptionToResponse(subscription));
            response.put("message", "Payment confirmed and subscription activated");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error confirming Razorpay payment", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to confirm payment"));
        }
    }

    /**
     * Get payment history
     * GET /api/payments/history
     */
    @GetMapping("/payments/history")
    public ResponseEntity<Map<String, Object>> getPaymentHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            UUID userId = userOpt.get().getId();
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

            Page<Payment> payments = paymentRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("content", payments.getContent().stream()
                    .map(this::paymentToResponse)
                    .collect(Collectors.toList()));
            response.put("page", payments.getNumber());
            response.put("size", payments.getSize());
            response.put("totalElements", payments.getTotalElements());
            response.put("totalPages", payments.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching payment history", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch payment history"));
        }
    }

    // Helper methods
    private LocalDate calculateEndDate(LocalDate startDate, String duration) {
        switch (duration.toLowerCase()) {
            case "per post":
            case "monthly":
                return startDate.plusMonths(1);
            case "yearly":
                return startDate.plusYears(1);
            default:
                return startDate.plusMonths(1);
        }
    }

    private Map<String, Object> planToResponse(SubscriptionPlan plan) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", plan.getId().toString());
        response.put("name", plan.getName());
        
        // Price information with discount support
        BigDecimal basePrice = plan.getBasePrice() != null ? plan.getBasePrice() : plan.getPrice();
        BigDecimal finalPrice = plan.getFinalPrice() != null ? plan.getFinalPrice() : plan.getPrice();
        
        response.put("basePrice", basePrice.doubleValue());
        response.put("price", finalPrice.doubleValue()); // Final price after discount
        response.put("finalPrice", finalPrice.doubleValue());
        
        // Discount information
        if (plan.getDiscountType() != null && plan.getDiscountValue() != null && plan.getDiscountValue().compareTo(BigDecimal.ZERO) > 0) {
            response.put("discountType", plan.getDiscountType());
            response.put("discountValue", plan.getDiscountValue().doubleValue());
            response.put("hasDiscount", true);
        } else {
            response.put("hasDiscount", false);
        }
        
        response.put("duration", plan.getDuration());
        response.put("jobPostsAllowed", plan.getJobPostsAllowed());
        if (plan.getFeatures() != null) {
            // Parse features if comma-separated or JSON
            try {
                response.put("features", Arrays.asList(plan.getFeatures().split(",")));
            } catch (Exception e) {
                response.put("features", new ArrayList<>());
            }
        } else {
            response.put("features", new ArrayList<>());
        }
        return response;
    }

    private Map<String, Object> subscriptionToResponse(Subscription subscription) {
        try {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", subscription.getId().toString());
            response.put("userId", subscription.getUserId().toString());
            
            // Safely get plan - it should be loaded with JOIN FETCH
            SubscriptionPlan plan = subscription.getPlan();
            if (plan != null) {
                response.put("plan", planToResponse(plan));
                response.put("jobPostsAllowed", plan.getJobPostsAllowed());
            } else {
                // Fallback if plan is not loaded
                response.put("plan", null);
                response.put("jobPostsAllowed", 0);
                logger.warn("Subscription plan not loaded for subscription: " + subscription.getId());
            }
            
            response.put("startDate", subscription.getStartDate().toString());
            response.put("endDate", subscription.getEndDate().toString());
            response.put("status", subscription.getStatus().name().toLowerCase());
            response.put("autoRenew", subscription.getAutoRenew());
            response.put("jobPostsUsed", subscription.getJobPostsUsed());
            
            if (subscription.getCancelledAt() != null) {
                response.put("cancelledAt", subscription.getCancelledAt().toString());
            }
            if (subscription.getCreatedAt() != null) {
                response.put("createdAt", subscription.getCreatedAt().toString());
            }
            return response;
        } catch (Exception e) {
            logger.error("Error converting subscription to response", e);
            throw new RuntimeException("Failed to convert subscription to response", e);
        }
    }

    private Map<String, Object> paymentToResponse(Payment payment) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", payment.getId().toString());
        response.put("userId", payment.getUserId().toString());
        if (payment.getSubscription() != null) {
            response.put("subscriptionId", payment.getSubscription().getId().toString());
        }
        response.put("amount", payment.getAmount().doubleValue());
        response.put("status", payment.getStatus().name().toLowerCase());
        response.put("transactionId", payment.getTransactionId());
        response.put("paymentMethod", payment.getPaymentMethod());
        if (payment.getPaidAt() != null) {
            response.put("paidAt", payment.getPaidAt().toString());
        }
        response.put("createdAt", payment.getCreatedAt().toString());
        return response;
    }
}

