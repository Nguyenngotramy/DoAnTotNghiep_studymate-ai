package com.studymate.service;

import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class StreakService {

    public static final ZoneId STREAK_ZONE = ZoneId.of("Asia/Bangkok");

    private final UserRepository userRepo;

    @Transactional
    public User applyStudyStreak(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        Instant now = Instant.now();
        LocalDate today = LocalDate.ofInstant(now, STREAK_ZONE);
        LocalDate yesterday = today.minusDays(1);
        LocalDate last = user.getLastStreakAt() == null
                ? null
                : LocalDate.ofInstant(user.getLastStreakAt(), STREAK_ZONE);

        boolean streakUpdated = false;

        if (last == null) {
            user.setStreak(Math.max(1, user.getStreak()));
            streakUpdated = true;
        } else if (last.isEqual(today)) {
            return user;
        } else if (last.isEqual(yesterday)) {
            user.setStreak(user.getStreak() + 1);
            streakUpdated = true;
        } else {
            user.setStreak(1);
            streakUpdated = true;
        }

        if (streakUpdated) {
            user.setLastStreakAt(now);
            user.setXp(Math.max(0, user.getXp()) + XPService.Action.STUDY_SESSION.points);
            return userRepo.save(user);
        }

        return user;
    }
}
