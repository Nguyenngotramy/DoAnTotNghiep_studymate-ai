package com.studymate.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryStorageService {

    private final Cloudinary cloudinary;

    public UploadResult uploadImage(MultipartFile file, String folder) throws IOException {
        validateFile(file, "image/", 10 * 1024 * 1024, "Ảnh tối đa 10MB!");

        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", buildFolder(folder),
                        "public_id", buildPublicId(file, false),
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
                        "folder", buildFolder(folder),
                        "public_id", buildPublicId(file, false),
                        "resource_type", "video",
                        "overwrite", false
                )
        );

        return toUploadResult(file, result, "VIDEO");
    }

    /**
     * Dùng cho upload file chung, ví dụ file chat.
     * IMAGE -> resource_type image
     * VIDEO -> resource_type video
     * PDF/DOCX/PPTX/EXCEL/TEXT/ARCHIVE/OTHER -> resource_type raw
     */
    public UploadResult uploadFile(MultipartFile file, String folder) throws IOException {
        validateAnyFile(file, 50 * 1024 * 1024, "File tối đa 50MB!");

        String type = detectType(file.getOriginalFilename());
        String resourceType = getResourceTypeForType(type);

        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", buildFolder(folder),
                        "public_id", buildPublicId(file, "raw".equals(resourceType)),
                        "resource_type", resourceType,
                        "overwrite", false
                )
        );

        return toUploadResult(file, result, type);
    }

    /**
     * Dùng riêng cho tài liệu nhóm.
     * Folder Cloudinary: studymate/groups/{groupId}/documents
     *
     * Lưu ý:
     * - PDF/DOCX/PPTX/XLSX/TXT nên upload dạng raw, không dùng auto.
     * - Nếu dùng auto, Cloudinary có thể nhận PDF thành image và sinh URL /image/upload/...pdf,
     *   khiến xem/tải file dễ lỗi.
     */
    public CloudinaryUploadResult uploadDocument(
            MultipartFile file,
            String groupId,
            String safeOriginalName
    ) throws IOException {
        validateAnyFile(file, 50 * 1024 * 1024, "Tài liệu tối đa 50MB!");

        String type = detectType(safeOriginalName);
        String resourceType = getResourceTypeForType(type);

        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "studymate/groups/" + groupId + "/documents",
                        "public_id", buildPublicIdFromName(safeOriginalName, "raw".equals(resourceType)),
                        "resource_type", resourceType,
                        "overwrite", false
                )
        );

        String secureUrl = Objects.toString(result.get("secure_url"), "");
        String publicId = Objects.toString(result.get("public_id"), "");
        String returnedResourceType = Objects.toString(result.get("resource_type"), resourceType);
        long sizeKb = Math.max(1, file.getSize() / 1024);

        if (secureUrl.isBlank()) {
            throw new IllegalStateException("Cloudinary không trả về secure_url");
        }

        if (publicId.isBlank()) {
            throw new IllegalStateException("Cloudinary không trả về public_id");
        }

        return new CloudinaryUploadResult(
                secureUrl,
                publicId,
                returnedResourceType,
                type,
                sizeKb
        );
    }

    /**
     * Xoá file trên Cloudinary.
     * Cần publicId và resourceType đã lưu trong MongoDB.
     */
    public void delete(String publicId, String resourceType) {
        if (publicId == null || publicId.isBlank()) return;

        try {
            String safeResourceType = resourceType == null || resourceType.isBlank()
                    ? "raw"
                    : resourceType;

            cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", safeResourceType)
            );
        } catch (Exception e) {
            log.warn(
                    "Không thể xoá file Cloudinary publicId={} resourceType={}: {}",
                    publicId,
                    resourceType,
                    e.getMessage()
            );
        }
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

    private void validateAnyFile(
            MultipartFile file,
            long maxSize,
            String maxSizeMessage
    ) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không hợp lệ!");
        }

        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException(maxSizeMessage);
        }
    }

    private String buildFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return "studymate/files";
        }

        String cleanFolder = folder.trim();

        if (cleanFolder.startsWith("studymate/")) {
            return cleanFolder;
        }

        return "studymate/" + cleanFolder;
    }

    private String buildPublicId(MultipartFile file, boolean keepExtension) {
        String originalName = file.getOriginalFilename();
        return buildPublicIdFromName(originalName, keepExtension);
    }

    /**
     * Với raw file, nên giữ extension trong public_id để URL có dạng:
     * /raw/upload/.../file.pdf
     *
     * Với image/video, không cần giữ extension trong public_id.
     */
    private String buildPublicIdFromName(String originalName, boolean keepExtension) {
        String safeName = originalName == null || originalName.isBlank()
                ? "file"
                : originalName;

        safeName = safeName.replaceAll("[^a-zA-Z0-9._-]", "_");

        int dotIndex = safeName.lastIndexOf('.');

        if (!keepExtension && dotIndex > 0) {
            safeName = safeName.substring(0, dotIndex);
        }

        safeName = safeName
                .toLowerCase(Locale.ROOT)
                .replaceAll("_+", "_")
                .replaceAll("^_+", "")
                .replaceAll("_+$", "");

        if (safeName.isBlank()) {
            safeName = keepExtension ? "file.bin" : "file";
        }

        return UUID.randomUUID() + "_" + safeName;
    }

    private UploadResult toUploadResult(MultipartFile file, Map<?, ?> result, String type) {
        String url = Objects.toString(result.get("secure_url"), "");
        String publicId = Objects.toString(result.get("public_id"), "");
        String resourceType = Objects.toString(result.get("resource_type"), getResourceTypeForType(type));

        if (url.isBlank()) {
            throw new IllegalStateException("Cloudinary không trả về secure_url");
        }

        if (publicId.isBlank()) {
            throw new IllegalStateException("Cloudinary không trả về public_id");
        }

        return UploadResult.builder()
                .url(url)
                .relativeUrl(url)
                .publicId(publicId)
                .resourceType(resourceType)
                .name(file.getOriginalFilename())
                .type(type)
                .sizeKb(Math.max(1, file.getSize() / 1024))
                .build();
    }

    private String detectType(String filename) {
        String ext = filename == null ? "" : filename.toLowerCase(Locale.ROOT);

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

    private String getResourceTypeForType(String type) {
        if ("IMAGE".equals(type)) return "image";
        if ("VIDEO".equals(type)) return "video";

        return "raw";
    }

    @Data
    @Builder
    public static class UploadResult {
        private String url;
        private String relativeUrl;
        private String publicId;
        private String resourceType;
        private String name;
        private String type;
        private long sizeKb;
    }

    /**
     * Result riêng cho DocumentService.
     *
     * Có cả record accessor:
     * - secureUrl()
     * - publicId()
     * - resourceType()
     * - type()
     * - sizeKb()
     *
     * Và getter kiểu JavaBean:
     * - getUrl()
     * - getSecureUrl()
     * - getPublicId()
     * - getResourceType()
     * - getType()
     * - getSizeKb()
     */
    public record CloudinaryUploadResult(
            String secureUrl,
            String publicId,
            String resourceType,
            String type,
            long sizeKb
    ) {
        public String getUrl() {
            return secureUrl;
        }

        public String getSecureUrl() {
            return secureUrl;
        }

        public String getPublicId() {
            return publicId;
        }

        public String getResourceType() {
            return resourceType;
        }

        public String getType() {
            return type;
        }

        public long getSizeKb() {
            return sizeKb;
        }
    }
}
