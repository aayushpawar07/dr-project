# AI assisted development
# Multi-stage build for Spring Boot Backend
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Create uploads directory and install OCR dependencies
RUN mkdir -p /app/uploads/verification && \
    apk update && \
    apk add --no-cache tesseract-ocr tesseract-ocr-data-hin tesseract-ocr-data-eng

# Copy JAR from build stage
COPY --from=build /app/target/medexjob-backend-1.0.0.jar app.jar

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/api/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

