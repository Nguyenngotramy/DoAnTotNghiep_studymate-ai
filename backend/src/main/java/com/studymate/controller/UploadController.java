package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/upload")
@RequiredArgsConstructor
public class UploadController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String ct = file.getContentType();
            if (ct == null || !ct.startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Chỉ hỗ trợ file ảnh!"));
            }
            if (file.getSize() > 10 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Ảnh tối đa 10MB!"));
            }

            UploadPayload payload = saveFile(file, "chat-images");
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.url,
                    "name", payload.name,
                    "type", "IMAGE",
                    "sizeKb", payload.sizeKb
            )));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload ảnh: " + e.getMessage()));
        }
    }

    @PostMapping("/video")
    public ResponseEntity<?> uploadVideo(@RequestParam("file") MultipartFile file) {
        try {
            String ct = file.getContentType();
            if (ct == null || !ct.startsWith("video/")) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Chỉ hỗ trợ file video!"));
            }
            if (file.getSize() > 50 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Video tối đa 50MB!"));
            }

            UploadPayload payload = saveFile(file, "videos");
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.url,
                    "name", payload.name,
                    "type", "VIDEO",
                    "sizeKb", payload.sizeKb
            )));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload video: " + e.getMessage()));
        }
    }

    @PostMapping("/chat-image")
    public ResponseEntity<?> uploadChatImage(@RequestParam("file") MultipartFile file) {
        try {
            String ct = file.getContentType();
            if (ct == null || !ct.startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Chỉ hỗ trợ ảnh cho chat!"));
            }

            UploadPayload payload = saveFile(file, "chat-images");
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.url,
                    "name", payload.name,
                    "type", "IMAGE",
                    "sizeKb", payload.sizeKb
            )));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload ảnh chat: " + e.getMessage()));
        }
    }

    @PostMapping("/chat-file")
    public ResponseEntity<?> uploadChatFile(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("File không được để trống!"));
            }

            if (file.getSize() > 25 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("File tối đa 25MB!"));
            }

            UploadPayload payload = saveFile(file, "chat-files");
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.url,
                    "name", payload.name,
                    "type", detectType(file.getOriginalFilename()),
                    "sizeKb", payload.sizeKb
            )));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload file chat: " + e.getMessage()));
        }
    }

    private UploadPayload saveFile(MultipartFile file, String folder) throws IOException {
        String ext = getExt(file.getOriginalFilename());
        String original = sanitizeFileName(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "_" + original.replace(" ", "_");

        Path dir = Paths.get(uploadDir, folder);
        Files.createDirectories(dir);
        Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        String url = "/uploads/" + folder + "/" + filename;
        return new UploadPayload(url, original, file.getSize() / 1024);
    }

    private String sanitizeFileName(String filename) {
        if (filename == null || filename.isBlank()) return "file";
        return filename.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private String getExt(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    private String detectType(String filename) {
        String ext = filename == null ? "" : filename.toLowerCase();

        if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg")
                || ext.endsWith(".gif") || ext.endsWith(".webp")) {
            return "IMAGE";
        }
        if (ext.endsWith(".pdf")) return "PDF";
        if (ext.endsWith(".doc") || ext.endsWith(".docx")) return "DOCX";
        if (ext.endsWith(".ppt") || ext.endsWith(".pptx")) return "PPTX";
        if (ext.endsWith(".xls") || ext.endsWith(".xlsx") || ext.endsWith(".csv")) return "EXCEL";
        if (ext.endsWith(".zip") || ext.endsWith(".rar")) return "ARCHIVE";
        if (ext.endsWith(".txt")) return "TEXT";
        return "OTHER";
    }

    private record UploadPayload(String url, String name, long sizeKb) {}
}