package com.studymate.service;

import com.studymate.dto.request.LoginRequest;
import com.studymate.dto.request.RegisterRequest;
import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import com.studymate.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;
    private final JwtService jwtService;
    private final PasswordEncoder encoder;
    private final EmailService emailService;
    private final UserAccountLockService accountLockService;

    private static final ZoneId STREAK_ZONE = ZoneId.of("Asia/Bangkok");

    public record AuthResponse(User user, String accessToken, String refreshToken) {}

    private final ConcurrentHashMap<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    private record OtpEntry(String otp, Instant expiresAt) {
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private static final Map<String, String> SUBJECT_COLORS = Map.of(
            "Toán", "#6366f1",
            "Tiếng Anh", "#ec4899",
            "Lập trình", "#14b8a6",
            "Vật lý", "#3b82f6",
            "Hóa học", "#22c55e",
            "Sinh học", "#10b981",
            "Ngữ văn", "#f97316",
            "Lịch sử", "#f59e0b",
            "IELTS", "#a78bfa",
            "AI/ML", "#8b5cf6"
    );

    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("Email hoặc mật khẩu không đúng"));

        user = accountLockService.resolveLockState(user);
        if (accountLockService.isAccessBlocked(user)) {
            throw new RuntimeException(accountLockService.blockMessage(user));
        }

        if (!encoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("Email hoặc mật khẩu không đúng");
        }

        user = applyDailyStreak(user);
        return tokens(user);
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        List<User.UserSkill> skills = new ArrayList<>();
        if (req.getStrongSubjects() != null) {
            for (String s : req.getStrongSubjects()) {
                skills.add(User.UserSkill.builder()
                        .subject(s)
                        .level(3)
                        .color(SUBJECT_COLORS.getOrDefault(s, "#6366f1"))
                        .build());
            }
        }

        if (req.getWeakSubjects() != null) {
            for (String s : req.getWeakSubjects()) {
                if (skills.stream().noneMatch(sk -> sk.getSubject().equals(s))) {
                    skills.add(User.UserSkill.builder()
                            .subject(s)
                            .level(1)
                            .color(SUBJECT_COLORS.getOrDefault(s, "#6366f1"))
                            .build());
                }
            }
        }

        List<String> majorTags = req.getMajor() == null ? List.of() : List.of(req.getMajor());
        List<String> interests = mergeSubjects(req.getStrongSubjects(), req.getWeakSubjects(), req.getInterests(), req.getInterestedFields(), majorTags);
        List<User.AvailableSlot> schedule = buildSchedule(req.getAvailableSchedule());

        User user = User.builder()
                .email(req.getEmail())
                .password(encoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .studentCode(req.getStudentCode())
                .role(User.Role.USER)
                .userType(req.getUserType())
                .school(req.getSchool())
                .major(req.getMajor())
                .interestedFields(req.getInterestedFields() != null ? req.getInterestedFields() : new ArrayList<>())
                .strongSubjects(req.getStrongSubjects() != null ? req.getStrongSubjects() : new ArrayList<>())
                .weakSubjects(req.getWeakSubjects() != null ? req.getWeakSubjects() : new ArrayList<>())
                .goal(req.getGoal())
                .skills(skills)
                .interests(interests)
                .availableSchedule(schedule)
                .onboardingDone(true)
                .xp(100)
                .streak(1)
                .lastStreakAt(Instant.now())
                .build();

        user = userRepo.save(user);
        return tokens(user);
    }

    public AuthResponse loginOrRegisterGoogle(String googleEmail, String fullName, String avatarUrl) {
        Optional<User> existing = userRepo.findByEmail(googleEmail);

        if (existing.isPresent()) {
            User user = existing.get();

            user = accountLockService.resolveLockState(user);
            if (accountLockService.isAccessBlocked(user)) {
                throw new RuntimeException(accountLockService.blockMessage(user));
            }

            boolean changed = false;
            if (user.getAvatar() == null && avatarUrl != null) {
                user.setAvatar(avatarUrl);
                changed = true;
            }

            User normalized = normalizeBannerFields(user);
            if (normalized != user) {
                user = normalized;
                changed = true;
            }

            if (changed) {
                user = userRepo.save(user);
            }

            user = applyDailyStreak(user);
            return tokens(user);
        }

        User newUser = User.builder()
                .email(googleEmail)
                .password(encoder.encode(UUID.randomUUID().toString()))
                .fullName(fullName != null ? fullName : googleEmail.split("@")[0])
                .avatar(avatarUrl)
                .role(User.Role.USER)
                .onboardingDone(false)
                .xp(50)
                .streak(1)
                .lastStreakAt(Instant.now())
                .build();

        newUser = userRepo.save(newUser);
        return tokens(newUser);
    }

    public Map<String, String> refresh(String refreshToken) {
        if (!jwtService.isValid(refreshToken)) {
            throw new RuntimeException("Refresh token không hợp lệ");
        }

        String userId = jwtService.extractUserId(refreshToken);
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        user = accountLockService.resolveLockState(user);
        if (accountLockService.isAccessBlocked(user)) {
            throw new RuntimeException(accountLockService.blockMessage(user));
        }

        user = normalizeAndSaveIfNeeded(user);

        return Map.of(
                "accessToken", jwtService.generateAccessToken(user.getId(), user.getRole().name())
        );
    }

    public void sendPasswordResetOtp(String email) {
        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) return;

        String otp = generateOtp();
        Instant expiresAt = Instant.now().plusSeconds(15 * 60);
        otpStore.put(email, new OtpEntry(otp, expiresAt));

        emailService.sendPasswordResetEmail(email, userOpt.get().getFullName(), otp);
    }

    public void sendAdminPasswordResetByUserId(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        sendPasswordResetOtp(user.getEmail());
    }

    public void verifyOtp(String email, String otp) {
        OtpEntry entry = otpStore.get(email);
        if (entry == null) {
            throw new RuntimeException("Mã OTP không tồn tại. Vui lòng yêu cầu lại.");
        }
        if (entry.isExpired()) {
            otpStore.remove(email);
            throw new RuntimeException("Mã OTP đã hết hạn (15 phút). Vui lòng yêu cầu mã mới.");
        }
        if (!entry.otp().equals(otp.trim())) {
            throw new RuntimeException("Mã OTP không đúng. Vui lòng kiểm tra lại.");
        }
    }

    public void resetPassword(String email, String otp, String newPassword) {
        verifyOtp(email, otp);

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        user.setPassword(encoder.encode(newPassword));
        userRepo.save(user);

        otpStore.remove(email);
        emailService.sendPasswordChangedConfirmation(email, user.getFullName());
    }

    private String generateOtp() {
        return String.format("%06d", new Random().nextInt(1_000_000));
    }

    @SafeVarargs
    private List<String> mergeSubjects(List<String>... subjectGroups) {
        LinkedHashMap<String, String> merged = new LinkedHashMap<>();
        for (List<String> subjects : subjectGroups) {
            addSubjects(merged, subjects);
        }
        return new ArrayList<>(merged.values());
    }

    private void addSubjects(LinkedHashMap<String, String> merged, List<String> subjects) {
        if (subjects == null) return;
        for (String subject : subjects) {
            if (subject == null || subject.isBlank()) continue;
            merged.putIfAbsent(subject.toLowerCase().trim(), subject.trim());
        }
    }

    private List<User.AvailableSlot> buildSchedule(List<RegisterRequest.AvailableSlotRequest> schedule) {
        if (schedule == null) return new ArrayList<>();
        return schedule.stream()
                .filter(s -> s.getDayOfWeek() != null && s.getStartTime() != null && s.getEndTime() != null)
                .map(s -> User.AvailableSlot.builder()
                        .dayOfWeek(s.getDayOfWeek())
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .build())
                .toList();
    }

    private AuthResponse tokens(User user) {
        String access = jwtService.generateAccessToken(user.getId(), user.getRole().name());
        String refresh = jwtService.generateRefreshToken(user.getId());
        return new AuthResponse(user, access, refresh);
    }

    private User applyDailyStreak(User user) {
        User normalized = normalizeBannerFields(user);

        Instant now = Instant.now();
        LocalDate today = LocalDate.ofInstant(now, STREAK_ZONE);
        LocalDate yesterday = today.minusDays(1);
        LocalDate last = normalized.getLastStreakAt() == null
                ? null
                : LocalDate.ofInstant(normalized.getLastStreakAt(), STREAK_ZONE);

        if (last == null) {
            normalized.setStreak(Math.max(1, normalized.getStreak()));
            normalized.setXp(normalized.getXp() + XPService.Action.DAILY_LOGIN.points);
            normalized.setLastStreakAt(now);
            return userRepo.save(normalized);
        }

        if (last.isEqual(today)) {
            return normalized != user ? userRepo.save(normalized) : user;
        }

        if (last.isEqual(yesterday)) {
            normalized.setStreak(normalized.getStreak() + 1);
        } else {
            normalized.setStreak(1);
        }

        normalized.setXp(normalized.getXp() + XPService.Action.DAILY_LOGIN.points);
        normalized.setLastStreakAt(now);
        return userRepo.save(normalized);
    }

    private User normalizeAndSaveIfNeeded(User user) {
        User normalized = normalizeBannerFields(user);
        return normalized != user ? userRepo.save(normalized) : user;
    }

    private User normalizeBannerFields(User user) {
        boolean changed = false;

        if (user.getXp() <= 0) {
            user.setXp(100);
            changed = true;
        }

        if (user.getStreak() <= 0) {
            user.setStreak(1);
            changed = true;
        }

        return changed ? user : user;
    }
}