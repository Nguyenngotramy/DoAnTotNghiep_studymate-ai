package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "vocabulary_sets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularySet {

    @Id
    private String id;

    private String title;
    private String description;
    private String folderId;

    private String createdById;
    private String createdByName;

    @Builder.Default
    private SourceType sourceType = SourceType.IMPORT;

    @Builder.Default
    private List<VocabEntry> entries = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public enum SourceType {
        IMPORT,
        AI,
        MANUAL
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VocabEntry {
        private String tuVung;
        private String nghia;
        private String viDu;
        private String phatAm;
        private Integer orderIndex;
    }
}
