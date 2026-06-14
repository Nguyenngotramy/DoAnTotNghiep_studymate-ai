package com.studymate.service;

import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class StreakServiceTest {

    private final UserRepository userRepo = mock(UserRepository.class);
    private final StreakService streakService = new StreakService(userRepo);

    @Test
    void startsStreakOnFirstStudyActivity() {
        User user = userWithStreak(0, null);
        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = streakService.applyStudyStreak("user-1");

        assertEquals(1, updated.getStreak());
        assertEquals(120, updated.getXp());
        verify(userRepo).save(user);
    }

    @Test
    void doesNotIncrementTwiceOnSameDay() {
        User user = userWithStreak(4, Instant.now());
        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));

        User updated = streakService.applyStudyStreak("user-1");

        assertEquals(4, updated.getStreak());
        assertEquals(100, updated.getXp());
        verify(userRepo, never()).save(any());
    }

    @Test
    void incrementsWhenPreviousStudyWasYesterday() {
        User user = userWithStreak(4, atStartOfDay(LocalDate.now(StreakService.STREAK_ZONE).minusDays(1)));
        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = streakService.applyStudyStreak("user-1");

        assertEquals(5, updated.getStreak());
        assertEquals(120, updated.getXp());
    }

    @Test
    void resetsAfterMissingAStudyDay() {
        User user = userWithStreak(8, atStartOfDay(LocalDate.now(StreakService.STREAK_ZONE).minusDays(2)));
        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = streakService.applyStudyStreak("user-1");

        assertEquals(1, updated.getStreak());
        assertEquals(120, updated.getXp());
    }

    private User userWithStreak(int streak, Instant lastStreakAt) {
        return User.builder()
                .id("user-1")
                .xp(100)
                .streak(streak)
                .lastStreakAt(lastStreakAt)
                .build();
    }

    private Instant atStartOfDay(LocalDate date) {
        ZoneId zone = StreakService.STREAK_ZONE;
        return date.atStartOfDay(zone).toInstant();
    }
}
