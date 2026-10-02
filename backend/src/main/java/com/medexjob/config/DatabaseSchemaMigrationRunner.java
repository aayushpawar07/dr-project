package com.medexjob.config;

import java.sql.Connection;
import java.sql.Statement;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Ensures existing database tables (such as MySQL `jobs`) have sufficient column widths
 * for newly introduced categories and enums (e.g. HOSPITAL_ADMINISTRATION, PSYCHOLOGY_MENTAL_HEALTH).
 * Runs on every profile including production at application startup.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseSchemaMigrationRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSchemaMigrationRunner.class);
    private final DataSource dataSource;

    public DatabaseSchemaMigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            logger.info("Checking and applying automatic database schema adjustments...");

            // Modify jobs.category to VARCHAR(100) to safely accommodate all JobCategory enum names
            try {
                stmt.execute("ALTER TABLE jobs MODIFY COLUMN category VARCHAR(100) NOT NULL");
                logger.info("Successfully ensured jobs.category is VARCHAR(100)");
            } catch (Exception ex) {
                logger.warn("Schema migration for jobs.category returned: {}", ex.getMessage());
            }

            // Modify jobs.sector to VARCHAR(50)
            try {
                stmt.execute("ALTER TABLE jobs MODIFY COLUMN sector VARCHAR(50) NOT NULL");
            } catch (Exception ignored) {}

            // Modify jobs.status to VARCHAR(50)
            try {
                stmt.execute("ALTER TABLE jobs MODIFY COLUMN status VARCHAR(50) NOT NULL");
            } catch (Exception ignored) {}

            // Modify jobs.experience_level to VARCHAR(50)
            try {
                stmt.execute("ALTER TABLE jobs MODIFY COLUMN experience_level VARCHAR(50) NULL");
            } catch (Exception ignored) {}

            // Modify jobs.duty_type to VARCHAR(50)
            try {
                stmt.execute("ALTER TABLE jobs MODIFY COLUMN duty_type VARCHAR(50) NULL");
            } catch (Exception ignored) {}

        } catch (Exception e) {
            logger.warn("DatabaseSchemaMigrationRunner could not execute DDL migrations: {}", e.getMessage());
        }
    }
}
