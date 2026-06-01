package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "flashcard_card_progress")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndex(name = "user_deck_card", def = "{'userId': 1, 'deckId': 1, 'cardId': 1}", unique = true)
public class FlashcardCardProgress {

    @Id
    private String id;

    private String userId;
    private String deckId;
    private String cardId;

    @Builder.Default
    private double easeFactor = 2.5;

    @Builder.Default
    private int intervalDays = 0;

    @Builder.Default
    private int repetitions = 0;

    private Instant nextReviewAt;
    private Instant lastReviewedAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public enum Rating {
        AGAIN, HARD, GOOD, EASY
    }
}
