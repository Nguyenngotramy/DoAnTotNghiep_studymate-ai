package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.*;

@Document(collection = "posts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Post {

    @Id
    private String id;

    private String authorId;
    private String authorName;
    private String authorAvatar;
    private String title;
    private String content;
    private String summary;
    private String subject;

    // AI Summary
    private String aiSummary;
    private String aiSummaryStatus;
    private Instant aiSummaryUpdatedAt;

    // AI Moderation
    private String moderationStatus;
    private String moderationReason;
    private String removedReason;
    private String aiDetectedSubject;
    private double aiTagConfidence;
    private String aiSafetyStatus;
    private String aiSafetyReason;
    private List<String> aiTagSuggestion;

    // AI media moderation
    private String mediaSafetyStatus;
    private String mediaSafetyReason;
    @Builder.Default
    private List<String> flaggedImageUrls = new ArrayList<>();
    private Instant mediaModeratedAt;
    private String reviewedByAdminId;
    private Instant reviewedAt;
    private String revisionMessage;
    private boolean authorRevisionRequired;

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    private String videoUrl;
    private String coverImage;

    @Builder.Default
    private Set<String> likedBy = new HashSet<>();

    @Builder.Default
    private Set<String> savedBy = new HashSet<>();

    @Builder.Default
    private int views = 0;

    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    @Builder.Default
    private List<PostReport> reports = new ArrayList<>();

    @Builder.Default
    private boolean published = true;

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
        private Instant updatedAt;
        private String parentId;
        private boolean deleted;
        private String deletedBy;
        private Instant deletedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostReport {
        private String id;
        private String userId;
        private String reason;
        private Instant createdAt;
    }
}