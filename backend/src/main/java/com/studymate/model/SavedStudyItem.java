package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "saved_study_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedStudyItem {

    @Id
    private String id;

    private String userId;
    private String sourceId;
    private String sourceType;

    private String title;
    private String description;

    private String groupId;
    private String groupName;

    /**
     * null = nằm ở thư mục gốc
     */
    private String folderId;

    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    private String videoUrl;

    @Builder.Default
    private List<Attachment> attachments = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

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
}