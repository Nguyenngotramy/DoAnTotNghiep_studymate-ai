package com.studymate.service;

import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserAccountLockService {

    private static final DateTimeFormatter LOCK_UNTIL_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.forLanguageTag("vi-VN"))
                    .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final UserRepository userRepo;

    /** Giải phóng khóa tạm nếu đã hết hạn; trả user mới nhất. */
    public User resolveLockState(User user) {
        if (user == null) return null;
        if (user.isPermanentlyBanned()) return user;

        if (user.isLocked() && user.getLockedUntil() != null
                && Instant.now().isAfter(user.getLockedUntil())) {
            user.setLocked(false);
            user.setLockedUntil(null);
            return userRepo.save(user);
        }
        return user;
    }

    public boolean isAccessBlocked(User user) {
        user = resolveLockState(user);
        if (user == null) return true;
        if (user.isPermanentlyBanned()) return true;
        if (!user.isLocked()) return false;
        if (user.getLockedUntil() != null) {
            return Instant.now().isBefore(user.getLockedUntil());
        }
        // Khóa thủ công admin (không có lockedUntil)
        return true;
    }

    public String blockMessage(User user) {
        if (user == null) return "Tài khoản không hợp lệ";
        if (user.isPermanentlyBanned()) {
            return "Tài khoản bị khóa vĩnh viễn do vi phạm nhiều lần sau cảnh cáo.";
        }
        if (user.isLocked() && user.getLockedUntil() != null) {
            return "Tài khoản bị khóa đến " + LOCK_UNTIL_FMT.format(user.getLockedUntil())
                    + ". Vui lòng thử lại sau.";
        }
        return "Tài khoản đã bị khóa";
    }

    public void applyPermanentBan(User user, String reason) {
        user.setPermanentlyBanned(true);
        user.setLocked(true);
        user.setLockedUntil(null);
        userRepo.save(user);
    }

    public void applyTemporaryLock(User user, int days, String reason) {
        user.setLocked(true);
        user.setPermanentlyBanned(false);
        user.setLockedUntil(Instant.now().plusSeconds(days * 86400L));
        userRepo.save(user);
    }

    public void adminUnlock(User user) {
        user.setLocked(false);
        user.setLockedUntil(null);
        user.setPermanentlyBanned(false);
        userRepo.save(user);
    }
}
