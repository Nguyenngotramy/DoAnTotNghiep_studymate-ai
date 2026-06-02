package com.studymate.service;

import com.studymate.model.User;
import com.studymate.model.UserWarning;
import com.studymate.repository.UserRepository;
import com.studymate.repository.UserWarningRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Quy tắc cảnh cáo admin:
 * REMINDER ×5 → khóa 10 ngày; tái phạm → vĩnh viễn
 * WARNING  ×3 → khóa 20 ngày; tái phạm → vĩnh viễn
 * SEVERE   ×2 → khóa 30 ngày; tái phạm → vĩnh viễn
 */
@Service
@RequiredArgsConstructor
public class UserWarningDisciplineService {

    public static final int REMINDER_THRESHOLD = 5;
    public static final int WARNING_THRESHOLD = 3;
    public static final int SEVERE_THRESHOLD = 2;

    public static final int REMINDER_LOCK_DAYS = 10;
    public static final int WARNING_LOCK_DAYS = 20;
    public static final int SEVERE_LOCK_DAYS = 30;

    private final UserWarningRepository userWarningRepo;
    private final UserRepository userRepo;
    private final UserAccountLockService accountLockService;
    private final NotificationService notificationService;

    public record WarningCounts(long reminder, long warning, long severe) {
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("reminder", reminder);
            m.put("warning", warning);
            m.put("severe", severe);
            m.put("total", reminder + warning + severe);
            m.put("reminderThreshold", REMINDER_THRESHOLD);
            m.put("warningThreshold", WARNING_THRESHOLD);
            m.put("severeThreshold", SEVERE_THRESHOLD);
            return m;
        }
    }

    public Map<String, WarningCounts> countWarningsByUserIds(Collection<String> userIds) {
        Map<String, MutableCounts> mutable = new HashMap<>();
        if (userIds == null) return Map.of();
        for (String userId : userIds) {
            if (userId != null && !userId.isBlank()) {
                mutable.put(userId, new MutableCounts());
            }
        }
        if (mutable.isEmpty()) return Map.of();

        for (UserWarning w : userWarningRepo.findByUserIdIn(mutable.keySet())) {
            if (w.getUserId() == null) continue;
            MutableCounts c = mutable.computeIfAbsent(w.getUserId(), id -> new MutableCounts());
            switch (normalizeLevel(w.getLevel())) {
                case "REMINDER" -> c.reminder++;
                case "SEVERE" -> c.severe++;
                default -> c.warning++;
            }
        }

        Map<String, WarningCounts> result = new HashMap<>();
        mutable.forEach((id, c) -> result.put(id, new WarningCounts(c.reminder, c.warning, c.severe)));
        return result;
    }

    private static final class MutableCounts {
        long reminder;
        long warning;
        long severe;
    }

    public WarningCounts countWarningsForUser(String userId) {
        return countWarningsByUserIds(java.util.List.of(userId))
                .getOrDefault(userId, new WarningCounts(0, 0, 0));
    }

    public record DisciplineResult(
            boolean actionTaken,
            String actionType,
            String message,
            long warningCountAtLevel,
            int threshold
    ) {
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("actionTaken", actionTaken);
            m.put("actionType", actionType);
            m.put("message", message);
            m.put("warningCountAtLevel", warningCountAtLevel);
            m.put("threshold", threshold);
            return m;
        }
    }

    public DisciplineResult evaluateAfterWarning(User user, String level) {
        if (user == null) return none();

        String normalized = normalizeLevel(level);
        long count = userWarningRepo.countByUserIdAndLevel(user.getId(), normalized);

        return switch (normalized) {
            case "REMINDER" -> evaluateLevel(
                    user, count, REMINDER_THRESHOLD, REMINDER_LOCK_DAYS,
                    user.isReminderDisciplineApplied(), true, false, false,
                    "REMINDER");
            case "SEVERE" -> evaluateLevel(
                    user, count, SEVERE_THRESHOLD, SEVERE_LOCK_DAYS,
                    user.isSevereDisciplineApplied(), false, false, true,
                    "SEVERE");
            default -> evaluateLevel(
                    user, count, WARNING_THRESHOLD, WARNING_LOCK_DAYS,
                    user.isWarningDisciplineApplied(), false, true, false,
                    "WARNING");
        };
    }

    private DisciplineResult evaluateLevel(
            User user,
            long count,
            int threshold,
            int lockDays,
            boolean disciplineAlreadyApplied,
            boolean markReminder,
            boolean markWarning,
            boolean markSevere,
            String levelLabel
    ) {
        if (count < threshold) {
            return new DisciplineResult(
                    false,
                    "NONE",
                    "Đã ghi nhận cảnh cáo (" + count + "/" + threshold + " mức " + levelLabel + ").",
                    count,
                    threshold
            );
        }

        if (disciplineAlreadyApplied || user.isPermanentlyBanned()) {
            accountLockService.applyPermanentBan(user,
                    "Tái phạm sau khi bị xử lý cảnh cáo mức " + levelLabel);
            notifyUserLock(user, "Tài khoản bị khóa vĩnh viễn do tái phạm (mức " + levelLabel + ").");
            return new DisciplineResult(
                    true,
                    "PERMANENT_BAN",
                    "Người dùng đã tái phạm — khóa tài khoản vĩnh viễn.",
                    count,
                    threshold
            );
        }

        accountLockService.applyTemporaryLock(user, lockDays,
                "Đủ " + threshold + " cảnh cáo mức " + levelLabel);
        if (markReminder) user.setReminderDisciplineApplied(true);
        if (markWarning) user.setWarningDisciplineApplied(true);
        if (markSevere) user.setSevereDisciplineApplied(true);
        userRepo.save(user);

        notifyUserLock(user,
                "Tài khoản bị khóa " + lockDays + " ngày do đủ " + threshold
                        + " cảnh cáo mức " + levelLabel + ". Lần tái phạm sẽ bị khóa vĩnh viễn.");

        return new DisciplineResult(
                true,
                "TEMPORARY_LOCK",
                "Đã khóa tài khoản " + lockDays + " ngày (đủ " + threshold + " cảnh cáo " + levelLabel + ").",
                count,
                threshold
        );
    }

    private void notifyUserLock(User user, String message) {
        notificationService.send(
                user.getId(),
                "Tài khoản bị khóa",
                message,
                "ACCOUNT_LOCKED",
                "/login",
                null
        );
    }

    private String normalizeLevel(String level) {
        if (level == null) return "WARNING";
        return switch (level.trim().toUpperCase(Locale.ROOT)) {
            case "REMINDER" -> "REMINDER";
            case "SEVERE" -> "SEVERE";
            default -> "WARNING";
        };
    }

    private DisciplineResult none() {
        return new DisciplineResult(false, "NONE", "", 0, 0);
    }
}
