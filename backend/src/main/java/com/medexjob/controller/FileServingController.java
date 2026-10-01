package com.medexjob.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
public class FileServingController {

    private static final Logger logger = LoggerFactory.getLogger(FileServingController.class);

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @GetMapping(value = {"/api/uploads/**", "/uploads/**"})
    public ResponseEntity<?> serveUploadedFile(HttpServletRequest request) {
        String uri = request.getRequestURI();
        logger.info("Serving file request for URI: {}", uri);

        // Strip prefix: /api/uploads/ or /uploads/
        String relativePath = "";
        if (uri.startsWith("/api/uploads/")) {
            relativePath = uri.substring("/api/uploads/".length());
        } else if (uri.startsWith("/uploads/")) {
            relativePath = uri.substring("/uploads/".length());
        }

        if (relativePath.isBlank()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not specified");
        }

        // Prevent directory traversal attacks
        if (relativePath.contains("..") || relativePath.contains("//")) {
            logger.warn("Directory traversal attempt detected: {}", relativePath);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid file path");
        }

        // Search paths: primary uploadDir, subfolders, and absolute fallbacks
        Path primaryPath = Paths.get(uploadDir, relativePath);
        File targetFile = primaryPath.toFile();

        if (!targetFile.exists() || !targetFile.isFile()) {
            // Check within job-documents subdirectory if not specified in path
            Path subPath = Paths.get(uploadDir, "job-documents", relativePath);
            if (subPath.toFile().exists() && subPath.toFile().isFile()) {
                targetFile = subPath.toFile();
            } else {
                // Check current working directory uploads/
                Path cwdPath = Paths.get("uploads", relativePath);
                if (cwdPath.toFile().exists() && cwdPath.toFile().isFile()) {
                    targetFile = cwdPath.toFile();
                } else {
                    Path cwdSub = Paths.get("uploads", "job-documents", relativePath);
                    if (cwdSub.toFile().exists() && cwdSub.toFile().isFile()) {
                        targetFile = cwdSub.toFile();
                    }
                }
            }
        }

        if (!targetFile.exists() || !targetFile.isFile()) {
            logger.warn("File not found on disk: {} (searched in {})", relativePath, primaryPath.toAbsolutePath());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not found: " + relativePath);
        }

        try {
            String probeContentType = Files.probeContentType(targetFile.toPath());
            MediaType mediaType;
            if (probeContentType != null) {
                mediaType = MediaType.parseMediaType(probeContentType);
            } else if (targetFile.getName().toLowerCase().endsWith(".pdf")) {
                mediaType = MediaType.APPLICATION_PDF;
            } else if (targetFile.getName().toLowerCase().endsWith(".jpg") || targetFile.getName().toLowerCase().endsWith(".jpeg")) {
                mediaType = MediaType.IMAGE_JPEG;
            } else if (targetFile.getName().toLowerCase().endsWith(".png")) {
                mediaType = MediaType.IMAGE_PNG;
            } else {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }

            Resource resource = new FileSystemResource(targetFile);
            String contentDisposition = mediaType.equals(MediaType.APPLICATION_PDF)
                    ? "inline; filename=\"" + targetFile.getName() + "\""
                    : "inline; filename=\"" + targetFile.getName() + "\"";

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(resource);

        } catch (IOException e) {
            logger.error("Error reading file {}: {}", targetFile.getAbsolutePath(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error reading file");
        }
    }
}
