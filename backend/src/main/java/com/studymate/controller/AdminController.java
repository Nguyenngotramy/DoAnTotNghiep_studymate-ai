package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.dto.PageResponse;
import com.studymate.model.Group;
import com.studymate.model.PredictRecord;
import com.studymate.model.User;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.PredictRecordRepository;
import com.studymate.repository.UserRepository;
import com.studymate.service.AdminService;
import com.studymate.service.AuthService;
import com.studymate.service.UserAccountLockService;
import com.studymate.service.UserWarningDisciplineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepo;
    private final GroupRepository groupRepo;
    private final PredictRecordRepository predictRepo;
    private final AdminService adminService;
    private final AuthService authService;
    private final UserAccountLockService accountLockService;
    private final UserWarningDisciplineService warningDisciplineService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getDashboard()));
    }

    @GetMapping("/alerts/center")
    public ResponseEntity<?> alertCenter() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAlertCenter()));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> userDetail(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getUserDetail(userId)));
    }

    @GetMapping("/users/{userId}/activity")
    public ResponseEntity<?> userActivity(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getUserActivity(userId)));
    }

    @GetMapping("/users/{userId}/predict-history")
    public ResponseEntity<?> userPredictHistory(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getUserPredictHistory(userId)));
    }

    @GetMapping("/users/{userId}/study-terms")
    public ResponseEntity<?> userStudyTerms(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getUserStudyTerms(userId)));
    }

    @GetMapping("/groups")
    public ResponseEntity<?> groups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String filter
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAdminGroups(page, search, filter)));
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<?> groupDetail(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAdminGroupDetail(id)));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<?> deleteGroup(@PathVariable String id) {
        adminService.forceDeleteGroup(id, "Nhóm bị quản trị viên xóa");
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa nhóm"));
    }

    @DeleteMapping("/groups/{id}/force")
    public ResponseEntity<?> forceDeleteGroup(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        adminService.forceDeleteGroup(id, reason);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã giải tán nhóm"));
    }

    @PostMapping("/group-posts/{postId}/approve")
    public ResponseEntity<?> approveGroupPost(@PathVariable String postId) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.approveGroupPost(postId), "Đã duyệt bài đăng"));
    }

    @PostMapping("/group-posts/{postId}/reject")
    public ResponseEntity<?> rejectGroupPost(
            @PathVariable String postId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.ok(
                adminService.rejectGroupPost(postId, reason),
                "Đã từ chối bài đăng"
        ));
    }

    @PostMapping("/documents/{docId}/approve")
    public ResponseEntity<?> approveDocument(@PathVariable String docId) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.approveDocument(docId), "Đã duyệt tài liệu"));
    }

    @PostMapping("/documents/{docId}/under-review")
    public ResponseEntity<?> underReviewDocument(
            @PathVariable String docId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(
                ApiResponse.ok(
                        adminService.markDocumentUnderReview(docId, reason),
                        "Đã chuyển tài liệu sang trạng thái xem xét"
                )
        );
    }

    @PostMapping("/documents/{docId}/reject")
    public ResponseEntity<?> rejectDocument(
            @PathVariable String docId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.ok(
                adminService.rejectDocument(docId, reason),
                "Đã từ chối tài liệu"
        ));
    }

    @PostMapping("/users/{userId}/support-reminder")
    public ResponseEntity<?> sendSupportReminder(
            @PathVariable String userId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String title = body != null ? body.get("title") : null;
        String message = body != null ? body.get("message") : null;
        return ResponseEntity.ok(ApiResponse.ok(
                adminService.sendSupportReminder(userId, title, message),
                "Đã gửi nhắc nhở hỗ trợ học tập"
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        List<User> allUsers = userRepo.findAll();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", allUsers.size());
        stats.put("totalGroups", groupRepo.count());
        stats.put("totalPredicts", predictRepo.count());
        stats.put("lockedUsers", allUsers.stream().filter(User::isLocked).count());
        stats.put("adminCount", allUsers.stream().filter(u -> u.getRole() == User.Role.ADMIN).count());
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/users")
    public ResponseEntity<?> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        int safeSize = Math.min(Math.max(size, 1), 10000);
        PageRequest pr = PageRequest.of(page, safeSize, Sort.by("createdAt").descending());
        Page<User> result;

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            List<User> filtered = userRepo.findAll().stream()
                    .filter(u -> (u.getFullName() != null && u.getFullName().toLowerCase().contains(q))
                            || (u.getEmail() != null && u.getEmail().toLowerCase().contains(q))
                            || (u.getStudentCode() != null && u.getStudentCode().toLowerCase().contains(q)))
                    .collect(Collectors.toList());

            int start = page * safeSize;
            int end = Math.min(start + safeSize, filtered.size());
            List<User> pageContent = (start < filtered.size()) ? filtered.subList(start, end) : List.of();
            result = new PageImpl<>(pageContent, pr, filtered.size());
        } else {
            result = userRepo.findAll(pr);
        }

        List<String> userIds = result.getContent().stream().map(User::getId).toList();
        Map<String, UserWarningDisciplineService.WarningCounts> warningCounts =
                warningDisciplineService.countWarningsByUserIds(userIds);

        List<Map<String, Object>> rows = result.getContent().stream()
                .map(u -> toAdminUserRow(u, warningCounts.get(u.getId())))
                .toList();

        Page<Map<String, Object>> mapped = new PageImpl<>(rows, pr, result.getTotalElements());
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(mapped)));
    }

    private Map<String, Object> toAdminUserRow(User u, UserWarningDisciplineService.WarningCounts warnings) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", u.getId());
        row.put("email", u.getEmail());
        row.put("fullName", u.getFullName());
        row.put("studentCode", u.getStudentCode());
        row.put("avatar", u.getAvatar());
        row.put("role", u.getRole() != null ? u.getRole().name() : "USER");
        row.put("userType", u.getUserType());
        row.put("locked", u.isLocked());
        row.put("permanentlyBanned", u.isPermanentlyBanned());
        row.put("lockedUntil", u.getLockedUntil());
        row.put("createdAt", u.getCreatedAt());
        row.put("xp", u.getXp());
        row.put("streak", u.getStreak());

        UserWarningDisciplineService.WarningCounts wc = warnings != null
                ? warnings
                : new UserWarningDisciplineService.WarningCounts(0, 0, 0);
        row.put("warningCounts", wc.toMap());
        row.put("warningReminderCount", wc.reminder());
        row.put("warningLevelCount", wc.warning());
        row.put("warningSevereCount", wc.severe());
        row.put("warningTotalCount", wc.reminder() + wc.warning() + wc.severe());
        return row;
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        userRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa tài khoản"));
    }

    @PostMapping("/users/{id}/lock")
    public ResponseEntity<?> lock(@PathVariable String id) {
        userRepo.findById(id).ifPresent(u -> {
            u.setLocked(true);
            userRepo.save(u);
        });
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã khoá tài khoản"));
    }

    @PostMapping("/users/{id}/unlock")
    public ResponseEntity<?> unlock(@PathVariable String id) {
        userRepo.findById(id).ifPresent(u -> accountLockService.adminUnlock(u));
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã mở khoá tài khoản"));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable String id) {
        authService.sendAdminPasswordResetByUserId(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã gửi email reset mật khẩu"));
    }

    @GetMapping("/ml/results")
    public ResponseEntity<?> mlResults(@RequestParam(defaultValue = "0") int page) {
        Page<PredictRecord> result = predictRepo.findAll(PageRequest.of(page, 20, Sort.by("createdAt").descending()));

        List<PredictRecord> all = predictRepo.findAll();
        Map<String, Long> gradeDist = all.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getPredictedGrade() != null ? r.getPredictedGrade() : "UNKNOWN",
                        Collectors.counting()
                ));

        double avgProb = all.stream()
                .mapToDouble(PredictRecord::getProbability)
                .average()
                .orElse(0);

        Map<String, Object> data = new HashMap<>();
        data.put("records", PageResponse.of(result));
        data.put("gradeDistribution", gradeDist);
        data.put("totalPredictions", all.size());
        data.put("avgProbability", Math.round(avgProb * 10.0) / 10.0);

        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> alerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();

        long lockedCount = userRepo.findAll().stream().filter(User::isLocked).count();
        if (lockedCount > 0) {
            alerts.add(Map.of(
                    "id", "locked-users",
                    "level", "warning",
                    "title", "Tài khoản bị khóa",
                    "message", lockedCount + " tài khoản đang bị khóa",
                    "createdAt", Instant.now().toString()
            ));
        }

        long groupCount = groupRepo.count();
        if (groupCount > 10) {
            alerts.add(Map.of(
                    "id", "many-groups",
                    "level", "info",
                    "title", "Nhóm học",
                    "message", groupCount + " nhóm đang hoạt động trên hệ thống",
                    "createdAt", Instant.now().toString()
            ));
        }

        long predictCount = predictRepo.count();
        if (predictCount > 0) {
            alerts.add(Map.of(
                    "id", "ml-usage",
                    "level", "success",
                    "title", "ML Service hoạt động",
                    "message", predictCount + " lần dự đoán học lực đã được thực hiện",
                    "createdAt", Instant.now().toString()
            ));
        }

        return ResponseEntity.ok(ApiResponse.ok(alerts));
    }

    @GetMapping("/logs")
    public ResponseEntity<?> logs(@RequestParam(defaultValue = "0") int page) {
        Page<PredictRecord> logs = predictRepo.findAll(PageRequest.of(page, 50, Sort.by("createdAt").descending()));

        List<Map<String, Object>> logEntries = logs.getContent().stream().map(r -> {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", r.getId());
            entry.put("userId", r.getUserId());
            entry.put("action", "PREDICT");
            entry.put("detail", "Dự đoán học lực: " + r.getPredictedGrade() + " (GPA " + r.getGpa() + ")");
            entry.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
            return entry;
        }).collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("content", logEntries);
        data.put("totalElements", logs.getTotalElements());
        data.put("totalPages", logs.getTotalPages());
        data.put("page", page);

        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/documents")
    public ResponseEntity<?> documents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String uploader
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                adminService.getAdminDocuments(status, groupId, type, uploader)
        ));
    }

    @PostMapping("/documents/{docId}/remove")
    public ResponseEntity<?> removeDocument(
            @PathVariable String docId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;

        return ResponseEntity.ok(ApiResponse.ok(
                adminService.removeDocument(docId, reason),
                "Đã gỡ tài liệu"
        ));
    }
}