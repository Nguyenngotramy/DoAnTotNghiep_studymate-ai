package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.NotificationBroadcast;
import com.studymate.model.User;
import com.studymate.repository.NotificationBroadcastRepository;
import com.studymate.repository.UserRepository;
import com.studymate.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/admin/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final UserRepository userRepo;
    private final NotificationService notifService;
    private final NotificationBroadcastRepository notificationBroadcastRepo;

    @PostMapping("/send")
    public ResponseEntity<?> sendAdminNotification(@RequestBody Map<String, Object> body, org.springframework.security.core.Authentication auth) {
        String title = getString(body, "title");
        String message = getString(body, "message");

        if (message == null || message.isBlank()) {
            message = getString(body, "body");
        }

        String type = defaultString(getString(body, "type"), "GENERAL");
        String priority = defaultString(getString(body, "priority"), "NORMAL");
        String targetType = defaultString(getString(body, "targetType"), "ALL");

        if (title == null || title.isBlank()) {
            throw new RuntimeException("Tiêu đề thông báo không được để trống");
        }

        if (message == null || message.isBlank()) {
            throw new RuntimeException("Nội dung thông báo không được để trống");
        }

        List<String> recipientIds = resolveRecipientIds(targetType, body.get("userIds"));

        if (recipientIds.isEmpty()) {
            throw new RuntimeException("Không có người dùng phù hợp để gửi thông báo");
        }

        String senderId = auth != null ? auth.getName() : null;
        notifService.broadcast(recipientIds, title.trim(), message.trim(), senderId);

        NotificationBroadcast saved = notificationBroadcastRepo.save(
                NotificationBroadcast.builder()
                        .title(title.trim())
                        .message(message.trim())
                        .type(type)
                        .priority(priority)
                        .targetType(targetType)
                        .recipientIds(recipientIds)
                        .recipientCount(recipientIds.size())
                        .createdBy(senderId != null ? senderId : "admin")
                        .createdAt(Instant.now())
                        .build()
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("broadcastId", saved.getId());
        result.put("recipientCount", saved.getRecipientCount());
        result.put("message", "Đã gửi thông báo thành công");

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/broadcast")
    public ResponseEntity<?> broadcast(@RequestBody Map<String, Object> body, org.springframework.security.core.Authentication auth) {
        body.put("targetType", "ALL");
        body.putIfAbsent("type", "GENERAL");
        body.putIfAbsent("priority", "NORMAL");
        return sendAdminNotification(body, auth);
    }

    @GetMapping("/history")
    public ResponseEntity<?> history() {
        return ResponseEntity.ok(
                ApiResponse.ok(notificationBroadcastRepo.findTop50ByOrderByCreatedAtDesc())
        );
    }

    private List<String> resolveRecipientIds(String targetType, Object rawUserIds) {
        if ("ALL".equalsIgnoreCase(targetType)) {
            return userRepo.findAll()
                    .stream()
                    .map(User::getId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
        }

        if (rawUserIds instanceof List<?> list) {
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .filter(id -> !id.isBlank())
                    .distinct()
                    .toList();
        }

        return List.of();
    }

    private String getString(Map<String, Object> body, String key) {
        if (body == null) return null;
        Object value = body.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
