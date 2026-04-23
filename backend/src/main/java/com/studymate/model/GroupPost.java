package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.*;

@Document(collection = "group_posts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupPost {

    @Id
    private String id;

    private String groupId;

    private String authorId;
    private String authorName;
    private String authorAvatar;

    private String content;

    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    private String videoUrl;

    @Builder.Default
    private List<Attachment> attachments = new ArrayList<>();

    @Builder.Default
    private Set<String> likedBy = new HashSet<>();

    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    /**
     * Trạng thái bài đăng:
     * APPROVED = hiển thị bình thường
     * PENDING  = chờ trưởng nhóm duyệt
     * REJECTED = đã bị từ chối
     */
    @Builder.Default
    private PostStatus status = PostStatus.APPROVED;

    /**
     * user nào đã tự ẩn bài này khỏi feed của họ
     */
    @Builder.Default
    private Set<String> hiddenByUserIds = new HashSet<>();

    /**
     * danh sách report
     */
    @Builder.Default
    private List<PostReport> reports = new ArrayList<>();

    private Instant approvedAt;
    private String approvedBy;

    private Instant rejectedAt;
    private String rejectedBy;
    private String rejectedReason;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public int getLikesCount() {
        return likedBy == null ? 0 : likedBy.size();
    }

    public int getCommentsCount() {
        return comments == null ? 0 : comments.size();
    }

    public int getReportsCount() {
        return reports == null ? 0 : reports.size();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Attachment {
        private String name;
        private String url;
        private String type;
        private long sizeKb;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Comment {
        private String id;
        private String authorId;
        private String authorName;
        private String authorAvatar;
        private String content;
        private Instant createdAt;

        @Builder.Default
        private List<Reply> replies = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Reply {
        private String id;
        private String authorId;
        private String authorName;
        private String authorAvatar;
        private String content;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostReport {
        private String id;
        private String userId;
        private String fullName;
        private String reason;
        private Instant createdAt;
    }

    public enum PostStatus {
        PENDING, APPROVED, REJECTED
    }
}