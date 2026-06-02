package com.studymate.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardStudySummaryResponse {
    private String deckId;
    private int totalCards;
    private int dueCount;
    private int newCount;

    @Builder.Default
    private List<FlashcardCardProgressView> cards = new ArrayList<>();
}
