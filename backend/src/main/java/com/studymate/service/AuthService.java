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
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;
    private final JwtService jwtService;
    private final PasswordEncoder encoder;
    private final EmailService emailService;

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

    // ── Đăng nhập ─────────────────────────────────────────
    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("Email hoặc mật khẩu không đúng"));

        if (user.isLocked()) {
            throw new RuntimeException("Tài khoản đã bị khoá");
        }

        if (!encoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("Email hoặc mật khẩu không đúng");
        }

        user = ensureBannerDefaults(user);
        return tokens(user);
    }

    // ── Đăng ký ───────────────────────────────────────────
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

        List<String> interests = new ArrayList<>();
        if (req.getStrongSubjects() != null) interests.addAll(req.getStrongSubjects());
        if (req.getWeakSubjects() != null) interests.addAll(req.getWeakSubjects());

        User user = User.builder()
                .email(req.getEmail())
                .password(encoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .studentCode(req.getStudentCode())
                .role(User.Role.USER)
                .userType(req.getUserType())
                .school(req.getSchool())
                .strongSubjects(req.getStrongSubjects() != null ? req.getStrongSubjects() : new ArrayList<>())
                .weakSubjects(req.getWeakSubjects() != null ? req.getWeakSubjects() : new ArrayList<>())
                .goal(req.getGoal())
                .skills(skills)
                .interests(interests)
                .onboardingDone(true)
                .xp(100)
                .streak(1)
                .build();

        user = userRepo.save(user);
        return tokens(user);
    }

    // ── Google OAuth — tìm hoặc tạo user ──────────────────
    public AuthResponse loginOrRegisterGoogle(String googleEmail, String fullName, String avatarUrl) {
        Optional<User> existing = userRepo.findByEmail(googleEmail);

        if (existing.isPresent()) {
            User user = existing.get();

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
                .build();

        newUser = userRepo.save(newUser);
        return tokens(newUser);
    }

    // ── Refresh ────────────────────────────────────────────
    public Map<String, String> refresh(String refreshToken) {
        if (!jwtService.isValid(refreshToken)) {
            throw new RuntimeException("Refresh token không hợp lệ");
        }

        String userId = jwtService.extractUserId(refreshToken);
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        user = ensureBannerDefaults(user);

        return Map.of(
                "accessToken", jwtService.generateAccessToken(user.getId(), user.getRole().name())
        );
    }

    // ══════════════════════════════════════════════════════
    // QUÊN MẬT KHẨU — OTP FLOW
    // ══════════════════════════════════════════════════════

    public void sendPasswordResetOtp(String email) {
        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) return;

        String otp = generateOtp();
        Instant expiresAt = Instant.now().plusSeconds(15 * 60);
        otpStore.put(email, new OtpEntry(otp, expiresAt));

        emailService.sendPasswordResetEmail(email, userOpt.get().getFullName(), otp);
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

    // ── Helpers ────────────────────────────────────────────

    private String generateOtp() {
        return String.format("%06d", new Random().nextInt(1_000_000));
    }

    private AuthResponse tokens(User user) {
        String access = jwtService.generateAccessToken(user.getId(), user.getRole().name());
        String refresh = jwtService.generateRefreshToken(user.getId());
        return new AuthResponse(user, access, refresh);
    }

    /**
     * Vá dữ liệu cho user cũ để banner không bị 0 mãi.
     * Chỉ set mặc định khi field đang <= 0.
     */
    private User ensureBannerDefaults(User user) {
        User normalized = normalizeBannerFields(user);

        if (normalized != user) {
            return userRepo.save(normalized);
        }
        return user;
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