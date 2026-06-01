package com.studymate.util;

import com.studymate.model.FlashcardCardProgress;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

public final class Sm2Scheduler {

    private Sm2Scheduler() {}

    public static int ratingToQuality(FlashcardCardProgress.Rating rating) {
        return switch (rating) {
            case AGAIN -> 1;
            case HARD -> 3;
            case GOOD -> 4;
            case EASY -> 5;
        };
    }

    public static FlashcardCardProgress applyReview(FlashcardCardProgress progress, FlashcardCardProgress.Rating rating) {
        int quality = ratingToQuality(rating);
        double ease = progress.getEaseFactor() <= 0 ? 2.5 : progress.getEaseFactor();
        int reps = Math.max(0, progress.getRepetitions());
        int interval = Math.max(0, progress.getIntervalDays());

        if (quality < 3) {
            reps = 0;
            interval = 1;
        } else {
            if (reps == 0) {
                interval = 1;
            } else if (reps == 1) {
                interval = 6;
            } else {
                interval = Math.max(1, (int) Math.round(interval * ease));
            }
            reps += 1;
            ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            if (ease < 1.3) {
                ease = 1.3;
            }
            if (rating == FlashcardCardProgress.Rating.EASY && interval < 4) {
                interval = Math.max(interval, 4);
            }
        }

        progress.setEaseFactor(ease);
        progress.setRepetitions(reps);
        progress.setIntervalDays(interval);
        progress.setLastReviewedAt(Instant.now());
        progress.setNextReviewAt(Instant.now().plus(interval, ChronoUnit.DAYS));
        return progress;
    }

    public static boolean isDue(FlashcardCardProgress progress, Instant now) {
        if (progress == null || progress.getNextReviewAt() == null) {
            return true;
        }
        return !progress.getNextReviewAt().isAfter(now);
    }
}
