package com.studymate.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

import com.studymate.repository.UserRepository;
import com.studymate.model.User;

@Service
@RequiredArgsConstructor
public class XPService {

    private final UserRepository userRepo;

    public enum Action {
        POST_CREATED(50),
        POST_SAVED(50),
        COMMENT_OR_REPLY(20),
        DAILY_LOGIN(10),
        TASK_COMPLETED(30),
        SHARE_RELEVANT(15),
        /** XP khi cập nhật streak học tập (phiên flashcard/quiz trong ngày). */
        STUDY_SESSION(20);

        public final int points;
        Action(int p) { this.points = p; }
    }

    @Transactional
    public int award(String userId, Action action) {
        User user = userRepo.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Integer currentXp = user.getXp();
        int newXp = (currentXp == null ? 0 : currentXp) + action.points;
        user.setXp(newXp);
        userRepo.save(user);
        return newXp;
    }

    @Transactional
    public int awardXp(String userId, int xpPoints) {
        User user = userRepo.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Integer currentXp = user.getXp();
        int newXp = (currentXp == null ? 0 : currentXp) + xpPoints;
        user.setXp(newXp);
        userRepo.save(user);
        return newXp;
    }
}