package com.studymate.controller;
import com.studymate.dto.*;
import com.studymate.model.*;
import com.studymate.repository.*;
import com.studymate.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequestMapping("/admin") @RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepo;
    private final GroupRepository groupRepo;
    private final PredictRecordRepository predictRepo;
    private final NotificationService notifService;

    // ── Stats tổng quan ─────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        List<User> allUsers = userRepo.findAll();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers",  allUsers.size());
        stats.put("totalGroups", groupRepo.count());
        stats.put("totalPredicts", predictRepo.count());
        stats.put("lockedUsers", allUsers.stream().filter(User::isLocked).count());
        stats.put("adminCount",  allUsers.stream().filter(u -> u.getRole() == User.Role.ADMIN).count());
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    // ── Quản lý người dùng ──────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<?> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String search) {

        PageRequest pr = PageRequest.of(page, 20, Sort.by("createdAt").descending());
        Page<User> result;

        if (search != null && !search.isBlank()) {
            // Tìm kiếm theo email hoặc tên (filter in-memory vì MongoDB text index chưa cấu hình)
            String q = search.toLowerCase();
            List<User> filtered = userRepo.findAll().stream()
                    .filter(u -> (u.getFullName() != null && u.getFullName().toLowerCase().contains(q))
                            || (u.getEmail() != null && u.getEmail().toLowerCase().contains(q))
                            || (u.getStudentCode() != null && u.getStudentCode().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
            int start = page * 20;
            int end   = Math.min(start + 20, filtered.size());
            List<User> pageContent = (start < filtered.size()) ? filtered.subList(start, end) : List.of();
            result = new PageImpl<>(pageContent, pr, filtered.size());
        } else {
            result = userRepo.findAll(pr);
        }
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(result)));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        userRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa tài khoản"));
    }

    @PostMapping("/users/{id}/lock")
    public ResponseEntity<?> lock(@PathVariable String id) {
        userRepo.findById(id).ifPresent(u -> { u.setLocked(true); userRepo.save(u); });
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã khoá tài khoản"));
    }

    @PostMapping("/users/{id}/unlock")
    public ResponseEntity<?> unlock(@PathVariable String id) {
        userRepo.findById(id).ifPresent(u -> { u.setLocked(false); userRepo.save(u); });
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã mở khoá"));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable String id) {
        // Trong thực tế: gửi email reset. Ở đây trả thông báo thành công.
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã gửi email reset mật khẩu"));
    }

    // ── Quản lý nhóm ────────────────────────────────────
    @GetMapping("/groups")
    public ResponseEntity<?> groups(@RequestParam(defaultValue = "0") int page) {
        Page<Group> result = groupRepo.findAll(
                PageRequest.of(page, 20, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(result)));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<?> deleteGroup(@PathVariable String id) {
        groupRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa nhóm"));
    }

    // ── ML Results (Predict records) ────────────────────
    @GetMapping("/ml/results")
    public ResponseEntity<?> mlResults(@RequestParam(defaultValue = "0") int page) {
        Page<PredictRecord> result = predictRepo.findAll(
                PageRequest.of(page, 20, Sort.by("createdAt").descending()));

        // Thống kê phân phối điểm dự đoán
        List<PredictRecord> all = predictRepo.findAll();
        Map<String, Long> gradeDist = all.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getPredictedGrade() != null ? r.getPredictedGrade() : "UNKNOWN",
                        Collectors.counting()));

        double avgProb = all.stream()
                .mapToDouble(PredictRecord::getProbability).average().orElse(0);

        Map<String, Object> data = new HashMap<>();
        data.put("records", PageResponse.of(result));
        data.put("gradeDistribution", gradeDist);
        data.put("totalPredictions", all.size());
        data.put("avgProbability", Math.round(avgProb * 10.0) / 10.0);

        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    // ── Alerts (Cảnh báo hệ thống) ──────────────────────
    @GetMapping("/alerts")
    public ResponseEntity<?> alerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();

        // Cảnh báo tài khoản bị khóa nhiều
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

        // Cảnh báo nhóm không hoạt động (mock — trong thực tế check lastActivity)
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

        // Thống kê ML usage
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

    // ── Logs hoạt động ──────────────────────────────────
    @GetMapping("/logs")
    public ResponseEntity<?> logs(@RequestParam(defaultValue = "0") int page) {
        // Dùng predict records như audit log tạm thời
        // Trong thực tế nên có AuditLog collection riêng
        Page<PredictRecord> logs = predictRepo.findAll(
                PageRequest.of(page, 50, Sort.by("createdAt").descending()));

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

    // ── Broadcast notification ───────────────────────────
    @PostMapping("/notifications/broadcast")
    public ResponseEntity<?> broadcast(@RequestBody Map<String, String> body) {
        List<String> ids = userRepo.findAll().stream().map(User::getId).toList();
        notifService.broadcast(ids, body.get("title"), body.get("body"));
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã gửi thông báo đến " + ids.size() + " người dùng"));
    }
}