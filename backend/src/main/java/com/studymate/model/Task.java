package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    private String id;

    /**
     * null = task cá nhân ngoài nhóm
     * có giá trị = task thuộc nhóm
     */
    private String groupId;

    @Builder.Default
    private boolean personal = false;

    private String title;
    private String description;

    @Builder.Default
    private Status status = Status.TODO;

    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    private String label;
    private String labelColor;

    private String assigneeId;
    private String assigneeName;

    private String createdById;
    private String createdByName;

    private Instant deadline;

    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    @Builder.Default
    private Submission submission = Submission.builder().build();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public enum Status {
        TODO, IN_PROGRESS, DONE
    }

    public enum Priority {
        LOW, MEDIUM, HIGH
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Comment {
        private String id;
        private String authorId;
        private String authorName;
        private String content;
        private Instant createdAt;
        private Instant updatedAt;

        @Builder.Default
        private boolean edited = false;

        @Builder.Default
        private List<Comment> replies = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Submission {
        private String answerText;

        @Builder.Default
        private List<Attachment> files = new ArrayList<>();

        @Builder.Default
        private List<Attachment> images = new ArrayList<>();

        @Builder.Default
        private boolean submitted = false;

        private Instant submittedAt;
        private String submittedById;
        private String submittedByName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Attachment {
        private String name;
        private String url;
        private String type;
        private Long size;
    }
}