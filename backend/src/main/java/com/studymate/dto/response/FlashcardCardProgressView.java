package com.studymate.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardCardProgressView {
    private String cardId;
    private double easeFactor;
    private int intervalDays;
    private int repetitions;
    private Instant nextReviewAt;
    private Instant lastReviewedAt;
    private boolean due;
    private boolean isNew;
}
