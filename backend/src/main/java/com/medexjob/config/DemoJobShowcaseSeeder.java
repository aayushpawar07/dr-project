package com.medexjob.config;

import com.medexjob.service.DemoJobShowcaseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * After deploy/restart, inserts the showcase single + multi jobs if they are missing.
 * Does not change create/publish/listing behavior. Set SEED_SHOWCASE_JOBS=false to skip.
 */
@Component
@Order(20)
public class DemoJobShowcaseSeeder implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(DemoJobShowcaseSeeder.class);

    @Value("${SEED_SHOWCASE_JOBS:true}")
    private boolean enabled;

    private final DemoJobShowcaseService demoJobShowcaseService;

    public DemoJobShowcaseSeeder(DemoJobShowcaseService demoJobShowcaseService) {
        this.demoJobShowcaseService = demoJobShowcaseService;
    }

    @Override
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        try {
            logger.info("Seeding complete single-job and multi-job listings if missing");
            demoJobShowcaseService.publishShowcase();
        } catch (Exception ex) {
            logger.error("Showcase job seed failed; existing job flows are unchanged. {}", ex.getMessage(), ex);
        }
    }
}
