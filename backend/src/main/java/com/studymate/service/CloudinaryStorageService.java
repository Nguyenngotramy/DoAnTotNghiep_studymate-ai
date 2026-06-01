package com.studymate.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudinaryStorageService {

    private final Cloudinary cloudinary;

    public UploadResult uploadImage(MultipartFile file, String folder) throws IOException {
        validateFile(file, "image/", 10 * 1024 * 1024, "Ảnh tối đa 10MB!");

        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "studymate/" + folder,
                        "public_id", buildPublicId(file),
                        "resource_type", "image",
                        "overwrite", false
                )
        );

        return toUploadResult(file, result, "IMAGE");
    }

    public UploadResult uploadVideo(MultipartFile file, String folder) throws IOException {
        validateFile(file, "video/", 50 * 1024 * 1024, "Video tối đa 50MB!");

        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "studymate/" + folder,
                        "public_id", buildPublicId(file),
                        "resource_type", "video",
                        "overwrite", false
                )
        );

        return toUploadResult(file, result, "VIDEO");
    }

    public UploadResult uploadFile(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không hợp lệ!");
        }

        if (file.getSize() > 25 * 1024 * 1024) {
            throw new IllegalArgumentException("File tối đa 25MB!");
        }

        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "studymate/" + folder,
                        "public_id", buildPublicId(file),
                        "resource_type", "auto",
                        "overwrite", false
                )
        );

        return toUploadResult(file, result, detectType(file.getOriginalFilename()));
    }

    private void validateFile(
            MultipartFile file,
            String requiredPrefix,
            long maxSize,
            String maxSizeMessage
    ) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không hợp lệ!");
        }

        String contentType = file.getContentType();

        if (contentType == null || !contentType.startsWith(requiredPrefix)) {
            throw new IllegalArgumentException(
                    requiredPrefix.startsWith("image/")
                            ? "Chỉ hỗ trợ file ảnh!"
                            : "Chỉ hỗ trợ file video!"
            );
        }

        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException(maxSizeMessage);
        }
    }

    private String buildPublicId(MultipartFile file) {
        String originalName = file.getOriginalFilename();

        String safeName = originalName == null
                ? "file"
                : originalName.replaceAll("[^a-zA-Z0-9._-]", "_");

        int dotIndex = safeName.lastIndexOf('.');

        if (dotIndex > 0) {
            safeName = safeName.substring(0, dotIndex);
        }

        return UUID.randomUUID() + "_" + safeName;
    }

    private UploadResult toUploadResult(MultipartFile file, Map<?, ?> result, String type) {
        String url = String.valueOf(result.get("secure_url"));
        String publicId = String.valueOf(result.get("public_id"));

        return UploadResult.builder()
                .url(url)
                .relativeUrl(url)
                .publicId(publicId)
                .name(file.getOriginalFilename())
                .type(type)
                .sizeKb(file.getSize() / 1024)
                .build();
    }

    private String detectType(String filename) {
        String ext = filename == null ? "" : filename.toLowerCase();

        if (ext.endsWith(".png")
                || ext.endsWith(".jpg")
                || ext.endsWith(".jpeg")
                || ext.endsWith(".gif")
                || ext.endsWith(".webp")) {
            return "IMAGE";
        }

        if (ext.endsWith(".mp4")
                || ext.endsWith(".webm")
                || ext.endsWith(".ogg")
                || ext.endsWith(".mov")) {
            return "VIDEO";
        }

        if (ext.endsWith(".pdf")) return "PDF";
        if (ext.endsWith(".doc") || ext.endsWith(".docx")) return "DOCX";
        if (ext.endsWith(".ppt") || ext.endsWith(".pptx")) return "PPTX";
        if (ext.endsWith(".xls") || ext.endsWith(".xlsx") || ext.endsWith(".csv")) return "EXCEL";
        if (ext.endsWith(".zip") || ext.endsWith(".rar")) return "ARCHIVE";
        if (ext.endsWith(".txt")) return "TEXT";

        return "OTHER";
    }

    @Data
    @Builder
    public static class UploadResult {
        private String url;
        private String relativeUrl;
        private String publicId;
        private String name;
        private String type;
        private long sizeKb;
    }
}