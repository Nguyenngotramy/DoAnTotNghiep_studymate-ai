package com.studymate.controller;
import com.studymate.dto.*;
import com.studymate.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/notifications") @RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notifService;

    @GetMapping
    public ResponseEntity<?> list(Authentication auth, @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(ApiResponse.ok(notifService.getByUser(auth.getName(), page)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unread(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("count", notifService.countUnread(auth.getName()))));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable String id) {
        notifService.markRead(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        notifService.markAllRead(auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
