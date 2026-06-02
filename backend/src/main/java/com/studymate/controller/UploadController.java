//package com.studymate.controller;
//
//import com.studymate.dto.ApiResponse;
//import jakarta.servlet.http.HttpServletRequest;
//import lombok.RequiredArgsConstructor;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//import org.springframework.web.multipart.MultipartFile;
//
//import java.io.IOException;
//import java.nio.file.*;
//import java.util.Map;
//import java.util.UUID;
//
//@RestController
//@RequestMapping("/upload")
//@RequiredArgsConstructor
//public class UploadController {
//
//    @Value("${app.upload.dir:uploads}")
//    private String uploadDir;
//
//    /*
//     * Dùng khi nhiều máy cùng xem ảnh.
//     * Ví dụ trong application.yml:
//     * app.public-base-url: http://192.168.1.15:8080/api
//     *
//     * Nếu để trống, backend sẽ tự lấy theo request hiện tại.
//     */
//    @Value("${app.public-base-url:}")
//    private String publicBaseUrl;
//
//    @PostMapping("/image")
//    public ResponseEntity<?> uploadImage(
//            @RequestParam("file") MultipartFile file,
//            HttpServletRequest request
//    ) {
//        try {
//            String ct = file.getContentType();
//
//            if (ct == null || !ct.startsWith("image/")) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("Chỉ hỗ trợ file ảnh!"));
//            }
//
//            if (file.getSize() > 10 * 1024 * 1024) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("Ảnh tối đa 10MB!"));
//            }
//
//            UploadPayload payload = saveFile(file, "chat-images", request);
//
//            return ResponseEntity.ok(ApiResponse.ok(Map.of(
//                    "url", payload.url,
//                    "relativeUrl", payload.relativeUrl,
//                    "name", payload.name,
//                    "type", "IMAGE",
//                    "sizeKb", payload.sizeKb
//            )));
//        } catch (IOException e) {
//            return ResponseEntity.internalServerError()
//                    .body(ApiResponse.error("Lỗi upload ảnh: " + e.getMessage()));
//        }
//    }
//
//    @PostMapping("/video")
//    public ResponseEntity<?> uploadVideo(
//            @RequestParam("file") MultipartFile file,
//            HttpServletRequest request
//    ) {
//        try {
//            String ct = file.getContentType();
//
//            if (ct == null || !ct.startsWith("video/")) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("Chỉ hỗ trợ file video!"));
//            }
//
//            if (file.getSize() > 50 * 1024 * 1024) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("Video tối đa 50MB!"));
//            }
//
//            UploadPayload payload = saveFile(file, "videos", request);
//
//            return ResponseEntity.ok(ApiResponse.ok(Map.of(
//                    "url", payload.url,
//                    "relativeUrl", payload.relativeUrl,
//                    "name", payload.name,
//                    "type", "VIDEO",
//                    "sizeKb", payload.sizeKb
//            )));
//        } catch (IOException e) {
//            return ResponseEntity.internalServerError()
//                    .body(ApiResponse.error("Lỗi upload video: " + e.getMessage()));
//        }
//    }
//
//    @PostMapping("/chat-image")
//    public ResponseEntity<?> uploadChatImage(
//            @RequestParam("file") MultipartFile file,
//            HttpServletRequest request
//    ) {
//        try {
//            String ct = file.getContentType();
//
//            if (ct == null || !ct.startsWith("image/")) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("Chỉ hỗ trợ ảnh cho chat!"));
//            }
//
//            if (file.getSize() > 10 * 1024 * 1024) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("Ảnh tối đa 10MB!"));
//            }
//
//            UploadPayload payload = saveFile(file, "chat-images", request);
//
//            return ResponseEntity.ok(ApiResponse.ok(Map.of(
//                    "url", payload.url,
//                    "relativeUrl", payload.relativeUrl,
//                    "name", payload.name,
//                    "type", "IMAGE",
//                    "sizeKb", payload.sizeKb
//            )));
//        } catch (IOException e) {
//            return ResponseEntity.internalServerError()
//                    .body(ApiResponse.error("Lỗi upload ảnh chat: " + e.getMessage()));
//        }
//    }
//
//    @PostMapping("/chat-file")
//    public ResponseEntity<?> uploadChatFile(
//            @RequestParam("file") MultipartFile file,
//            HttpServletRequest request
//    ) {
//        try {
//            if (file.isEmpty()) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("File không được để trống!"));
//            }
//
//            if (file.getSize() > 25 * 1024 * 1024) {
//                return ResponseEntity.badRequest()
//                        .body(ApiResponse.error("File tối đa 25MB!"));
//            }
//
//            UploadPayload payload = saveFile(file, "chat-files", request);
//
//            return ResponseEntity.ok(ApiResponse.ok(Map.of(
//                    "url", payload.url,
//                    "relativeUrl", payload.relativeUrl,
//                    "name", payload.name,
//                    "type", detectType(file.getOriginalFilename()),
//                    "sizeKb", payload.sizeKb
//            )));
//        } catch (IOException e) {
//            return ResponseEntity.internalServerError()
//                    .body(ApiResponse.error("Lỗi upload file chat: " + e.getMessage()));
//        }
//    }
//
//    private UploadPayload saveFile(
//            MultipartFile file,
//            String folder,
//            HttpServletRequest request
//    ) throws IOException {
//        String original = sanitizeFileName(file.getOriginalFilename());
//        String filename = UUID.randomUUID() + "_" + original.replace(" ", "_");
//
//        Path dir = Paths.get(uploadDir, folder)
//                .toAbsolutePath()
//                .normalize();
//
//        Files.createDirectories(dir);
//
//        Path target = dir.resolve(filename).normalize();
//
//        if (!target.startsWith(dir)) {
//            throw new IOException("Tên file không hợp lệ");
//        }
//
//        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
//
//        String relativeUrl = "/uploads/" + folder + "/" + filename;
//        String url = buildPublicUrl(request, relativeUrl);
//
//        return new UploadPayload(url, relativeUrl, original, file.getSize() / 1024);
//    }
//
//    private String buildPublicUrl(HttpServletRequest request, String relativeUrl) {
//        String base = publicBaseUrl;
//
//        if (base == null || base.isBlank()) {
//            String scheme = request.getScheme();
//            String host = request.getServerName();
//            int port = request.getServerPort();
//            String contextPath = request.getContextPath();
//
//            boolean defaultPort =
//                    ("http".equalsIgnoreCase(scheme) && port == 80)
//                            || ("https".equalsIgnoreCase(scheme) && port == 443);
//
//            base = scheme + "://" + host + (defaultPort ? "" : ":" + port) + contextPath;
//        }
//
//        base = base.replaceAll("/+$", "");
//
//        if (!relativeUrl.startsWith("/")) {
//            relativeUrl = "/" + relativeUrl;
//        }
//
//        return base + relativeUrl;
//    }
//
//    private String sanitizeFileName(String filename) {
//        if (filename == null || filename.isBlank()) return "file";
//        return filename.replaceAll("[\\\\/:*?\"<>|]", "_");
//    }
//
//    private String detectType(String filename) {
//        String ext = filename == null ? "" : filename.toLowerCase();
//
//        if (ext.endsWith(".png")
//                || ext.endsWith(".jpg")
//                || ext.endsWith(".jpeg")
//                || ext.endsWith(".gif")
//                || ext.endsWith(".webp")) {
//            return "IMAGE";
//        }
//
//        if (ext.endsWith(".mp4")
//                || ext.endsWith(".webm")
//                || ext.endsWith(".ogg")
//                || ext.endsWith(".mov")) {
//            return "VIDEO";
//        }
//
//        if (ext.endsWith(".pdf")) return "PDF";
//        if (ext.endsWith(".doc") || ext.endsWith(".docx")) return "DOCX";
//        if (ext.endsWith(".ppt") || ext.endsWith(".pptx")) return "PPTX";
//        if (ext.endsWith(".xls") || ext.endsWith(".xlsx") || ext.endsWith(".csv")) return "EXCEL";
//        if (ext.endsWith(".zip") || ext.endsWith(".rar")) return "ARCHIVE";
//        if (ext.endsWith(".txt")) return "TEXT";
//
//        return "OTHER";
//    }
//
//    private record UploadPayload(
//            String url,
//            String relativeUrl,
//            String name,
//            long sizeKb
//    ) {
//    }
//}

package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.service.CloudinaryStorageService;
import com.studymate.service.CloudinaryStorageService.UploadResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/upload")
@RequiredArgsConstructor
public class UploadController {

    private final CloudinaryStorageService cloudinaryStorageService;

    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            UploadResult payload = cloudinaryStorageService.uploadImage(file, "images");

            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.getUrl(),
                    "relativeUrl", payload.getRelativeUrl(),
                    "publicId", payload.getPublicId(),
                    "name", payload.getName(),
                    "type", payload.getType(),
                    "sizeKb", payload.getSizeKb()
            )));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload ảnh lên Cloudinary: " + e.getMessage()));
        }
    }

    @PostMapping("/video")
    public ResponseEntity<?> uploadVideo(@RequestParam("file") MultipartFile file) {
        try {
            UploadResult payload = cloudinaryStorageService.uploadVideo(file, "videos");

            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.getUrl(),
                    "relativeUrl", payload.getRelativeUrl(),
                    "publicId", payload.getPublicId(),
                    "name", payload.getName(),
                    "type", payload.getType(),
                    "sizeKb", payload.getSizeKb()
            )));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload video lên Cloudinary: " + e.getMessage()));
        }
    }

    @PostMapping("/chat-image")
    public ResponseEntity<?> uploadChatImage(@RequestParam("file") MultipartFile file) {
        try {
            UploadResult payload = cloudinaryStorageService.uploadImage(file, "chat-images");

            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.getUrl(),
                    "relativeUrl", payload.getRelativeUrl(),
                    "publicId", payload.getPublicId(),
                    "name", payload.getName(),
                    "type", payload.getType(),
                    "sizeKb", payload.getSizeKb()
            )));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload ảnh chat lên Cloudinary: " + e.getMessage()));
        }
    }

    @PostMapping("/chat-file")
    public ResponseEntity<?> uploadChatFile(@RequestParam("file") MultipartFile file) {
        try {
            UploadResult payload = cloudinaryStorageService.uploadFile(file, "chat-files");

            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.getUrl(),
                    "relativeUrl", payload.getRelativeUrl(),
                    "publicId", payload.getPublicId(),
                    "name", payload.getName(),
                    "type", payload.getType(),
                    "sizeKb", payload.getSizeKb()
            )));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload file chat lên Cloudinary: " + e.getMessage()));
        }
    }

    @PostMapping("/file")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            UploadResult payload = cloudinaryStorageService.uploadFile(file, "files");

            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "url", payload.getUrl(),
                    "relativeUrl", payload.getRelativeUrl(),
                    "publicId", payload.getPublicId(),
                    "name", payload.getName(),
                    "type", payload.getType(),
                    "sizeKb", payload.getSizeKb()
            )));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi upload file lên Cloudinary: " + e.getMessage()));
        }
    }
}