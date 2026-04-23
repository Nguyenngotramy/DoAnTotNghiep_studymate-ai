package com.studymate.controller;

import com.studymate.dto.*;
import com.studymate.dto.request.*;
import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import com.studymate.security.JwtService;
import com.studymate.service.AuthService;
import com.studymate.service.EmailService;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private String resolveAbsDir() {
        return uploadDir.startsWith("/")
                ? uploadDir
                : System.getProperty("user.dir") + "/" + uploadDir;
    }

    @PostConstruct
    public void initUploadDir() {
        try {
            Files.createDirectories(Paths.get(resolveAbsDir(), "avatars"));
            System.out.println("[UPLOAD] Directory ready: " + resolveAbsDir() + "/avatars");
        } catch (IOException e) {
            System.err.println("[UPLOAD] WARNING cannot create dir: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        var res = authService.login(req);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "user", res.user(),
                "accessToken", res.accessToken(),
                "refreshToken", res.refreshToken()
        )));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        var res = authService.register(req);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "user", res.user(),
                "accessToken", res.accessToken(),
                "refreshToken", res.refreshToken()
        ), "Đăng ký thành công!"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                authService.refresh(body.get("refreshToken"))));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(ApiResponse.ok(null, "Đăng xuất thành công"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Chưa xác thực"));
        }

        String subject = auth.getName();
        System.out.println("[ME] subject: " + subject);

        return userRepo.findById(subject)
                .or(() -> userRepo.findByEmail(subject))
                .map(user -> ResponseEntity.ok(ApiResponse.ok(user)))
                .orElse(ResponseEntity.status(401).body(ApiResponse.error("User không tồn tại")));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(Authentication auth,
                                      @RequestBody Map<String, Object> body) {
        User user = findCurrentUser(auth);

        if (body.containsKey("fullName")) user.setFullName((String) body.get("fullName"));
        if (body.containsKey("bio")) user.setBio((String) body.get("bio"));
        if (body.containsKey("studentCode")) user.setStudentCode((String) body.get("studentCode"));
        if (body.containsKey("location")) user.setLocation((String) body.get("location"));
        if (body.containsKey("school")) user.setSchool((String) body.get("school"));
        if (body.containsKey("avatar")) user.setAvatar((String) body.get("avatar"));
        if (body.containsKey("coverImage")) user.setCoverImage((String) body.get("coverImage"));

        if (body.containsKey("userType")) user.setUserType((String) body.get("userType"));
        if (body.containsKey("goal")) user.setGoal((String) body.get("goal"));
        if (body.containsKey("onboardingDone")) user.setOnboardingDone((Boolean) body.get("onboardingDone"));

        if (body.containsKey("availableSchedule")) {
            try {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> slots = (List<Map<String, Object>>) body.get("availableSchedule");

                List<User.AvailableSlot> schedule = slots.stream().map(s ->
                        User.AvailableSlot.builder()
                                .dayOfWeek((String) s.get("dayOfWeek"))
                                .startTime((String) s.get("startTime"))
                                .endTime((String) s.get("endTime"))
                                .build()
                ).toList();

                user.setAvailableSchedule(schedule);
            } catch (Exception ignored) {}
        }

        if (body.containsKey("skills")) {
            try {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> sd = (List<Map<String, Object>>) body.get("skills");

                List<User.UserSkill> skills = new ArrayList<>();
                for (Map<String, Object> s : sd) {
                    skills.add(User.UserSkill.builder()
                            .subject((String) s.get("subject"))
                            .level(((Number) s.getOrDefault("level", 1)).intValue())
                            .color((String) s.getOrDefault("color", "#6366f1"))
                            .build());
                }

                user.setSkills(skills);
            } catch (Exception ignored) {}
        }

        if (body.containsKey("strongSubjects")) {
            try {
                @SuppressWarnings("unchecked")
                List<String> strongSubjects = (List<String>) body.get("strongSubjects");
                user.setStrongSubjects(strongSubjects != null ? strongSubjects : new ArrayList<>());
            } catch (Exception ignored) {}
        }

        if (body.containsKey("weakSubjects")) {
            try {
                @SuppressWarnings("unchecked")
                List<String> weakSubjects = (List<String>) body.get("weakSubjects");
                user.setWeakSubjects(weakSubjects != null ? weakSubjects : new ArrayList<>());
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(ApiResponse.ok(userRepo.save(user)));
    }

    @PutMapping("/me/skills")
    public ResponseEntity<?> updateSkills(Authentication auth,
                                          @RequestBody Map<String, Object> body) {
        User user = findCurrentUser(auth);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawSkills = (List<Map<String, Object>>) body.get("skills");

        if (rawSkills != null) {
            List<User.UserSkill> skills = rawSkills.stream().map(s ->
                    User.UserSkill.builder()
                            .subject((String) s.get("subject"))
                            .level(((Number) s.getOrDefault("level", 1)).intValue())
                            .color((String) s.getOrDefault("color", "#6366f1"))
                            .build()
            ).toList();
            user.setSkills(skills);
        }

        return ResponseEntity.ok(ApiResponse.ok(userRepo.save(user)));
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(Authentication auth,
                                            @RequestBody Map<String, String> body) {
        User user = findCurrentUser(auth);

        if (!passwordEncoder.matches(body.get("currentPassword"), user.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Mật khẩu hiện tại không đúng"));
        }

        user.setPassword(passwordEncoder.encode(body.get("newPassword")));
        userRepo.save(user);

        return ResponseEntity.ok(ApiResponse.ok(null, "Đổi mật khẩu thành công!"));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(Authentication auth,
                                          @RequestParam("file") MultipartFile file) {
        return saveImage(auth, file, "avatar");
    }

    @PostMapping("/me/cover")
    public ResponseEntity<?> uploadCover(Authentication auth,
                                         @RequestParam("file") MultipartFile file) {
        return saveImage(auth, file, "cover");
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUser(@PathVariable String userId) {
        return userRepo.findById(userId)
                .map(u -> ResponseEntity.ok(ApiResponse.ok(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/oauth2/token")
    public ResponseEntity<?> getOAuth2Token(HttpServletRequest request) {
        String accessToken = getCookie(request, "oauth_access_token");
        String refreshToken = getCookie(request, "oauth_refresh_token");

        if (accessToken == null || !jwtService.isValid(accessToken)) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Token OAuth2 không hợp lệ hoặc đã hết hạn"));
        }

        String userId = jwtService.extractUserId(accessToken);
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "user", user,
                "accessToken", accessToken,
                "refreshToken", refreshToken != null ? refreshToken : ""
        )));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email không được trống"));
        }

        authService.sendPasswordResetOtp(email);
        return ResponseEntity.ok(ApiResponse.ok(null,
                "Nếu email tồn tại, mã OTP đã được gửi. Kiểm tra hộp thư (kể cả spam)."));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        authService.verifyOtp(body.get("email"), body.get("otp"));
        return ResponseEntity.ok(ApiResponse.ok(null, "OTP hợp lệ"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mật khẩu tối thiểu 6 ký tự"));
        }

        authService.resetPassword(body.get("email"), body.get("otp"), newPassword);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đặt lại mật khẩu thành công!"));
    }

    private ResponseEntity<?> saveImage(Authentication auth, MultipartFile file, String type) {
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Chỉ hỗ trợ file ảnh!"));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Ảnh tối đa 5MB!"));
        }

        try {
            User user = findCurrentUser(auth);

            String safeId = user.getId().replaceAll("[^a-zA-Z0-9_\\-]", "_");
            String ext = getExt(file.getOriginalFilename());
            String filename = type + "_" + safeId + ext;

            Path dir = Paths.get(resolveAbsDir(), "avatars");
            Files.createDirectories(dir);

            Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

            String url = "/uploads/avatars/" + filename;

            if ("avatar".equals(type)) user.setAvatar(url);
            else user.setCoverImage(url);

            userRepo.save(user);

            System.out.println("[UPLOAD] Saved " + type + " → " + dir.resolve(filename));
            return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url)));
        } catch (IOException e) {
            System.err.println("[UPLOAD ERROR] " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Lỗi lưu file: " + e.getMessage()));
        }
    }

    private User findCurrentUser(Authentication auth) {
        String subject = auth.getName();
        return userRepo.findById(subject)
                .or(() -> userRepo.findByEmail(subject))
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
    }

    private String getCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    private String getExt(String fn) {
        if (fn == null) return ".jpg";
        int dot = fn.lastIndexOf('.');
        return dot >= 0 ? fn.substring(dot).toLowerCase() : ".jpg";
    }
}