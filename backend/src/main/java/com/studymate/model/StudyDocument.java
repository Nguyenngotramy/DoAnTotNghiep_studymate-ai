package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyDocument {

    @Id
    private String id;

    private String groupId;
    private String name;

    /**
     * URL dùng để frontend mở/tải file.
     * Sau khi chuyển sang Cloudinary, field này sẽ lưu secure_url của Cloudinary.
     */
    private String fileUrl;

    /**
     * Loại file hiển thị ở frontend: PDF, DOCX, PPTX, EXCEL, IMAGE, TEXT, OTHER.
     */
    private String type;

    /**
     * Lưu public_id để khi xoá document có thể xoá luôn file trên Cloudinary.
     * Với các file cũ đang lưu local, field này có thể null.
     */
    private String cloudinaryPublicId;

    /**
     * Lưu resource_type Cloudinary trả về: image, video hoặc raw.
     * Cần dùng khi destroy file trên Cloudinary.
     */
    private String cloudinaryResourceType;

    private String uploaderId;
    private String uploaderName;
    private long sizeKb;

    @Builder.Default
    private SourceType sourceType = SourceType.PAGE;

    private String messageId;

    @Builder.Default
    private ReviewStatus reviewStatus = ReviewStatus.APPROVED;

    @Builder.Default
    private List<DocumentReport> reports = new ArrayList<>();

    private String flagReason;

    private String reviewedBy;
    private String reviewedByName;
    private Instant reviewedAt;
    private String reviewNote;

    @CreatedDate
    private Instant createdAt;

    public int getReportsCount() {
        return reports == null ? 0 : reports.size();
    }

    public enum SourceType {
        PAGE, CHAT
    }

    public enum ReviewStatus {
        APPROVED,
        REPORTED,
        UNDER_REVIEW,
        REJECTED,
        REMOVED
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentReport {
        private String id;
        private String userId;
        private String fullName;
        private String reason;
        private Instant createdAt;
    }
}
