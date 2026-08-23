// AI assisted development
package com.medexjob.service;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPReply;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class FileUploadService {

    private static final Logger logger = LoggerFactory.getLogger(FileUploadService.class);

    // FTP Configuration from Hostinger
    @Value("${ftp.host:}")
    private String ftpHost;

    @Value("${ftp.port:21}")
    private int ftpPort;

    @Value("${ftp.username:}")
    private String ftpUsername;

    @Value("${ftp.password:}")
    private String ftpPassword;

    @Value("${ftp.remote-dir:public_html/uploads}")
    private String ftpRemoteDir;

    @Value("${file.base-url:https://medexjob.com}")
    private String baseUrl;
    
    @Value("${file.upload-dir:uploads}")
    private String localUploadDir;
    
    @Value("${file.use-ftp:false}")
    private boolean useFtp;

    @jakarta.annotation.PostConstruct
    public void init() {
        logger.info("==============================================");
        logger.info("FileUploadService Configuration:");
        logger.info("  FTP Enabled: {}", useFtp);
        logger.info("  FTP Host: {}", ftpHost);
        logger.info("  FTP Port: {}", ftpPort);
        logger.info("  FTP Remote Dir: {}", ftpRemoteDir);
        logger.info("  Base URL: {}", baseUrl);
        logger.info("  Local Upload Dir: {}", localUploadDir);
        logger.info("==============================================");
    }

    // Allowed file types
    private static final List<String> ALLOWED_TYPES = Arrays.asList(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/jpg"
    );

    // Allowed extensions
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
        "pdf", "doc", "docx", "png", "jpg", "jpeg"
    );

    // Dangerous file types to reject
    private static final List<String> DANGEROUS_EXTENSIONS = Arrays.asList(
        "exe", "js", "zip", "rar", "sh", "bat", "cmd", "com", "scr", "vbs", "jar", "dll"
    );

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * Upload file to Hostinger FTP server and return public URL
     * Falls back to local storage if FTP fails
     */
    public String uploadFile(MultipartFile file) throws IOException {
        return uploadFile(file, null); // No subfolder
    }
    
    /**
     * Upload file to Hostinger FTP server with optional subfolder
     * Falls back to local storage if FTP fails
     * @param file The file to upload
     * @param subfolder Optional subfolder (e.g., "news" for news images)
     */
    public String uploadFile(MultipartFile file, String subfolder) throws IOException {
        // Validate file
        validateFile(file);

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            originalFilename = "file";
        }
        String uniqueFilename = UUID.randomUUID().toString() + "_" + sanitizeFilename(originalFilename);

        // Read file content into byte array so we can use it multiple times if needed
        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
            logger.info("File read successfully. Size: {} bytes", fileBytes.length);
        } catch (IOException e) {
            logger.error("Failed to read file content: {}", e.getMessage(), e);
            throw new IOException("Failed to read file. Please try again.", e);
        }

        // Try FTP first if enabled (production)
        if (useFtp) {
            try {
                String url = uploadFileToFtp(fileBytes, uniqueFilename, originalFilename, subfolder);
                logger.info("File successfully uploaded to FTP: {}", url);
                return url;
            } catch (Exception e) {
                // In production, if FTP fails, log error but still try local as backup
                logger.error("FTP upload failed. Error: {}", e.getMessage(), e);
                logger.warn("Falling back to local storage as backup");
                // Fall through to local storage as backup
            }
        }

        // Local storage (development) or fallback (production)
        try {
            String url = uploadFileToLocal(fileBytes, uniqueFilename, originalFilename, subfolder);
            if (useFtp) {
                logger.warn("File saved to local storage as backup (FTP failed): {}", url);
            } else {
                logger.info("File saved to local storage: {}", url);
            }
            return url;
        } catch (Exception e) {
            logger.error("Both FTP and local storage failed for file: {}. Error: {}", originalFilename, e.getMessage(), e);
            throw new IOException("Failed to upload file. Please try again later.", e);
        }
    }

    /**
     * Upload raw bytes (server-generated files) to storage with optional subfolder.
     * Does not perform file-type validation.
     */
    public String uploadBytes(byte[] fileBytes, String filename, String subfolder) throws IOException {
        if (fileBytes == null || fileBytes.length == 0) {
            throw new IllegalArgumentException("File bytes are empty");
        }

        String originalFilename = filename != null && !filename.isEmpty() ? filename : "file";
        String uniqueFilename = UUID.randomUUID().toString() + "_" + sanitizeFilename(originalFilename);

        // Try FTP first if enabled
        if (useFtp) {
            try {
                return uploadFileToFtp(fileBytes, uniqueFilename, originalFilename, subfolder);
            } catch (Exception e) {
                logger.error("FTP upload failed for server file {}. Falling back to local. Error: {}", originalFilename, e.getMessage(), e);
            }
        }

        return uploadFileToLocal(fileBytes, uniqueFilename, originalFilename, subfolder);
    }
    
    /**
     * Upload file to FTP server
     */
    private String uploadFileToFtp(byte[] fileBytes, String uniqueFilename, String originalFilename, String subfolder) throws IOException {
        FTPClient ftpClient = new FTPClient();
        InputStream inputStream = null;

        try {
            // Connect to FTP server
            logger.info("Connecting to FTP server: {}:{}", ftpHost, ftpPort);
            ftpClient.connect(ftpHost, ftpPort);
            
            int replyCode = ftpClient.getReplyCode();
            if (!FTPReply.isPositiveCompletion(replyCode)) {
                throw new IOException("FTP server refused connection. Reply code: " + replyCode);
            }

            // Login to FTP server
            boolean loginSuccess = ftpClient.login(ftpUsername, ftpPassword);
            if (!loginSuccess) {
                throw new IOException("FTP login failed. Please check credentials.");
            }

            logger.info("Successfully logged in to FTP server");

            // Set file type to binary
            ftpClient.setFileType(FTP.BINARY_FILE_TYPE);
            ftpClient.setFileTransferMode(FTP.BINARY_FILE_TYPE);

            // Enable passive mode (important for most FTP servers)
            ftpClient.enterLocalPassiveMode();

            // Get current working directory
            String currentDir = ftpClient.printWorkingDirectory();
            logger.info("Current FTP directory: {}", currentDir);
            
            // Create remote directory if it doesn't exist
            createRemoteDirectory(ftpClient, ftpRemoteDir);

            // Try different path formats to change directory
            boolean changedDir = false;
            
            // Try 1: Absolute path with leading slash
            changedDir = ftpClient.changeWorkingDirectory("/" + ftpRemoteDir);
            if (changedDir) {
                logger.info("Successfully changed to directory using absolute path: /{}", ftpRemoteDir);
            } else {
                // Try 2: Relative path from current directory
                changedDir = ftpClient.changeWorkingDirectory(ftpRemoteDir);
                if (changedDir) {
                    logger.info("Successfully changed to directory using relative path: {}", ftpRemoteDir);
                } else {
                    // Try 3: Navigate step by step
                    String[] dirs = ftpRemoteDir.split("/");
                    StringBuilder pathBuilder = new StringBuilder();
                    for (String dir : dirs) {
                        if (dir.isEmpty()) continue;
                        pathBuilder.append("/").append(dir);
                        String testPath = pathBuilder.toString();
                        if (ftpClient.changeWorkingDirectory(testPath)) {
                            logger.info("Successfully navigated to: {}", testPath);
                            changedDir = true;
                        } else {
                            // Try without leading slash
                            String testPathNoSlash = pathBuilder.substring(1);
                            if (ftpClient.changeWorkingDirectory(testPathNoSlash)) {
                                logger.info("Successfully navigated to: {}", testPathNoSlash);
                                changedDir = true;
                            } else {
                                changedDir = false;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (!changedDir) {
                String finalDir = ftpClient.printWorkingDirectory();
                logger.error("Failed to change to remote directory: {}. Current directory: {}", ftpRemoteDir, finalDir);
                throw new IOException("Failed to access upload directory on server. Please contact support.");
            }
            
            logger.info("Successfully changed to upload directory: {}", ftpClient.printWorkingDirectory());

            // If subfolder is specified, navigate to it (create if doesn't exist)
            if (subfolder != null && !subfolder.trim().isEmpty()) {
                String subfolderPath = subfolder.trim();
                // Try to change to subfolder
                if (!ftpClient.changeWorkingDirectory(subfolderPath)) {
                    // Subfolder doesn't exist, create it
                    logger.info("Creating subfolder: {}", subfolderPath);
                    boolean created = ftpClient.makeDirectory(subfolderPath);
                    if (created) {
                        logger.info("Subfolder created successfully: {}", subfolderPath);
                        ftpClient.changeWorkingDirectory(subfolderPath);
                    } else {
                        logger.warn("Failed to create subfolder: {}. Uploading to main uploads folder.", subfolderPath);
                    }
                } else {
                    logger.info("Changed to subfolder: {}", subfolderPath);
                }
            }

            // Upload file using byte array
            inputStream = new java.io.ByteArrayInputStream(fileBytes);
            logger.info("Uploading file: {} to FTP server", uniqueFilename);
            
            boolean uploadSuccess = ftpClient.storeFile(uniqueFilename, inputStream);
            if (!uploadSuccess) {
                String errorMessage = "Failed to upload file. FTP reply: " + ftpClient.getReplyString();
                logger.error(errorMessage);
                throw new IOException(errorMessage);
            }

            logger.info("File uploaded successfully to FTP: {}", uniqueFilename);

            // Generate public URL (include subfolder if used)
            String urlPath = (subfolder != null && !subfolder.trim().isEmpty()) 
                ? "/uploads/" + subfolder.trim() + "/" + uniqueFilename 
                : "/uploads/" + uniqueFilename;
            String publicUrl = baseUrl + urlPath;
            
            logger.info("File uploaded successfully: {} -> {}", originalFilename, publicUrl);
            
            return publicUrl;

        } finally {
            // Close input stream
            if (inputStream != null) {
                try {
                    inputStream.close();
                } catch (IOException e) {
                    logger.warn("Error closing input stream", e);
                }
            }

            // Logout and disconnect
            if (ftpClient.isConnected()) {
                try {
                    ftpClient.logout();
                    ftpClient.disconnect();
                    logger.info("Disconnected from FTP server");
                } catch (IOException e) {
                    logger.warn("Error disconnecting from FTP server", e);
                }
            }
        }
    }
    
    /**
     * Upload file to local storage
     */
    private String uploadFileToLocal(byte[] fileBytes, String uniqueFilename, String originalFilename, String subfolder) throws IOException {
        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(localUploadDir);
            
            // If subfolder specified, add it to the path
            if (subfolder != null && !subfolder.trim().isEmpty()) {
                uploadPath = uploadPath.resolve(subfolder.trim());
            }
            
            if (!Files.exists(uploadPath)) {
                try {
                    Files.createDirectories(uploadPath);
                    logger.info("Created local upload directory: {}", uploadPath.toAbsolutePath());
                } catch (Exception dirException) {
                    logger.error("Failed to create upload directory: {}. Error: {}", uploadPath.toAbsolutePath(), dirException.getMessage(), dirException);
                    throw new IOException("Failed to create upload directory. Please check permissions: " + dirException.getMessage(), dirException);
                }
            }
            
            // Check if directory is writable
            if (!Files.isWritable(uploadPath)) {
                logger.error("Upload directory is not writable: {}", uploadPath.toAbsolutePath());
                throw new IOException("Upload directory is not writable. Please check permissions.");
            }

            // Save file to local storage using byte array
            Path filePath = uploadPath.resolve(uniqueFilename);
            try {
                Files.write(filePath, fileBytes);
                logger.info("File saved to local storage: {} ({} bytes)", filePath.toAbsolutePath(), fileBytes.length);
            } catch (Exception writeException) {
                logger.error("Failed to write file to: {}. Error: {}", filePath.toAbsolutePath(), writeException.getMessage(), writeException);
                throw new IOException("Failed to write file. Please check disk space and permissions: " + writeException.getMessage(), writeException);
            }

            // Generate URL - for local storage, use /uploads/ path (served by Nginx)
            String urlPath = (subfolder != null && !subfolder.trim().isEmpty()) 
                ? "/uploads/" + subfolder.trim() + "/" + uniqueFilename 
                : "/uploads/" + uniqueFilename;
            String publicUrl = baseUrl + urlPath;
            
            logger.info("File uploaded to local storage: {} -> {}", originalFilename, publicUrl);
            
            return publicUrl;
        } catch (IOException e) {
            // Re-throw IOException as-is
            throw e;
        } catch (Exception e) {
            logger.error("Error uploading file to local storage: {}", e.getMessage(), e);
            throw new IOException("Failed to upload file to local storage: " + e.getMessage(), e);
        }
    }

    /**
     * Create remote directory if it doesn't exist
     */
    private void createRemoteDirectory(FTPClient ftpClient, String remoteDir) throws IOException {
        // Get current directory
        String currentDir = ftpClient.printWorkingDirectory();
        logger.info("Starting directory creation from: {}", currentDir);
        
        // Try to go to root first
        try {
            ftpClient.changeWorkingDirectory("/");
            logger.info("Changed to root directory");
        } catch (Exception e) {
            logger.warn("Could not change to root, staying in current directory");
        }
        
        String[] directories = remoteDir.split("/");
        StringBuilder currentPath = new StringBuilder();

        for (String directory : directories) {
            if (directory.isEmpty()) {
                continue;
            }
            
            // Build path with leading slash
            currentPath.append("/").append(directory);
            String pathWithSlash = currentPath.toString();
            String pathWithoutSlash = currentPath.substring(1);

            // Check if directory exists - try both formats
            boolean exists = ftpClient.changeWorkingDirectory(pathWithSlash);
            if (!exists) {
                exists = ftpClient.changeWorkingDirectory(pathWithoutSlash);
            }
            
            if (!exists) {
                // Directory doesn't exist, create it
                logger.info("Directory doesn't exist, creating: {}", pathWithSlash);
                
                // Try creating with leading slash
                boolean created = ftpClient.makeDirectory(pathWithSlash);
                if (!created) {
                    // Try without leading slash
                    created = ftpClient.makeDirectory(pathWithoutSlash);
                }
                
                if (created) {
                    logger.info("Successfully created directory: {}", pathWithSlash);
                    // Try to enter the newly created directory
                    if (!ftpClient.changeWorkingDirectory(pathWithSlash)) {
                        ftpClient.changeWorkingDirectory(pathWithoutSlash);
                    }
                } else {
                    String reply = ftpClient.getReplyString();
                    logger.warn("Failed to create directory: {}. FTP reply: {}", pathWithSlash, reply);
                    // Continue anyway - directory might already exist or we might not have permission
                    // Try to enter it anyway
                    if (!ftpClient.changeWorkingDirectory(pathWithSlash)) {
                        ftpClient.changeWorkingDirectory(pathWithoutSlash);
                    }
                }
            } else {
                logger.debug("Directory already exists: {}", pathWithSlash);
            }
        }
        
        String finalDir = ftpClient.printWorkingDirectory();
        logger.info("Directory creation complete. Current directory: {}", finalDir);
    }

    /**
     * Validate file type, size, and security
     */
    private void validateFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or null");
        }

        // Check file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 10MB limit");
        }

        // Get file extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new IllegalArgumentException("File name is empty");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();

        // Check for dangerous extensions
        if (DANGEROUS_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File type not allowed: " + extension);
        }

        // Check for allowed extensions
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File type not allowed. Allowed types: pdf, doc, docx, png, jpg, jpeg");
        }

        // Check MIME type
        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            // Additional check: sometimes MIME type might not match, so we rely on extension
            logger.warn("MIME type {} doesn't match allowed types, but extension {} is allowed", contentType, extension);
        }
    }

    /**
     * Get file extension from filename
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }

    /**
     * Sanitize filename to prevent path traversal attacks
     */
    private String sanitizeFilename(String filename) {
        if (filename == null) {
            return "file";
        }
        // Remove path separators and dangerous characters
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /**
     * Delete file from FTP server or local storage
     */
    public void deleteFile(String fileUrl) throws IOException {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        // Extract filename from URL
        String filename = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
        
        // Check if it's a local file (contains /uploads/)
        if (fileUrl.contains("/uploads/")) {
            deleteLocalFile(filename);
        } else {
            // Try FTP deletion
            if (useFtp) {
                try {
                    deleteFileFromFtp(filename);
                } catch (IOException e) {
                    logger.warn("FTP deletion failed, trying local: {}", e.getMessage());
                    // Fallback to local deletion
                    deleteLocalFile(filename);
                }
            } else {
                deleteLocalFile(filename);
            }
        }
    }
    
    /**
     * Delete file from FTP server
     */
    private void deleteFileFromFtp(String filename) throws IOException {
        FTPClient ftpClient = new FTPClient();

        try {
            // Connect to FTP server
            logger.info("Connecting to FTP server for deletion: {}:{}", ftpHost, ftpPort);
            ftpClient.connect(ftpHost, ftpPort);
            
            int replyCode = ftpClient.getReplyCode();
            if (!FTPReply.isPositiveCompletion(replyCode)) {
                throw new IOException("FTP server refused connection. Reply code: " + replyCode);
            }

            // Login to FTP server
            boolean loginSuccess = ftpClient.login(ftpUsername, ftpPassword);
            if (!loginSuccess) {
                throw new IOException("FTP login failed. Please check credentials.");
            }

            // Set file type to binary
            ftpClient.setFileType(FTP.BINARY_FILE_TYPE);
            ftpClient.enterLocalPassiveMode();

            // Change to remote directory
            boolean changedDir = ftpClient.changeWorkingDirectory("/" + ftpRemoteDir);
            if (!changedDir) {
                changedDir = ftpClient.changeWorkingDirectory(ftpRemoteDir);
            }
            if (!changedDir) {
                logger.warn("Failed to change to remote directory: {}. File may not exist.", ftpRemoteDir);
                return;
            }

            // Delete file
            boolean deleted = ftpClient.deleteFile(filename);
            if (deleted) {
                logger.info("File deleted from FTP server: {}", filename);
            } else {
                logger.warn("Failed to delete file from FTP server: {}. File may not exist.", filename);
            }

        } finally {
            // Logout and disconnect
            if (ftpClient.isConnected()) {
                try {
                    ftpClient.logout();
                    ftpClient.disconnect();
                } catch (IOException e) {
                    logger.warn("Error disconnecting from FTP server", e);
                }
            }
        }
    }
    
    /**
     * Delete file from local storage
     */
    private void deleteLocalFile(String filename) throws IOException {
        try {
            Path filePath = Paths.get(localUploadDir).resolve(filename);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                logger.info("File deleted from local storage: {}", filename);
            } else {
                logger.warn("File not found in local storage: {}", filename);
            }
        } catch (IOException e) {
            logger.error("Error deleting file from local storage: {}", filename, e);
            throw new IOException("Failed to delete file from local storage: " + e.getMessage(), e);
        }
    }
}
