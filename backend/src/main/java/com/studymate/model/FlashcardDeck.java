package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "flashcard_decks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardDeck {

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
    private List<Card> cards = new ArrayList<>();

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
    public static class Card {
        private String id;
        private String question;
        private String answer;
        private Integer orderIndex;
    }
}