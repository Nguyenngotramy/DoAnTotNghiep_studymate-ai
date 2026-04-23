package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "quiz_sets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizSet {

    @Id
    private String id;

    private String title;
    private String description;

    private String folderId;

    private String createdById;
    private String createdByName;

    @Builder.Default
    private boolean aiGenerated = false;

    @Builder.Default
    private SourceType sourceType = SourceType.PERSONAL;

    private String sourceGroupId;
    private String sourceGroupName;

    private String sourceDocumentId;
    private String sourceDocumentName;

    @Builder.Default
    private List<Question> questions = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public enum SourceType {
        PERSONAL,
        DOCUMENT_AI
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question {
        private String id;
        private String question;

        @Builder.Default
        private List<String> options = new ArrayList<>();

        private Integer correctIndex;
        private String explanation;
        private Integer orderIndex;
    }
}