package com.studymate.controller;
import com.studymate.dto.ApiResponse;
import com.studymate.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/friends") @RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @GetMapping("/suggestions")
    public ResponseEntity<?> suggestions(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(friendService.suggestions(auth.getName())));
    }

    @GetMapping
    public ResponseEntity<?> friends(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(friendService.getFriends(auth.getName())));
    }

    @GetMapping("/pending")
    public ResponseEntity<?> pending(Authentication auth) {
        // Trả về list Map có cả requester User object
        return ResponseEntity.ok(ApiResponse.ok(friendService.getPending(auth.getName())));
    }

    @PostMapping("/{userId}/request")
    public ResponseEntity<?> sendRequest(@PathVariable String userId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                friendService.sendRequest(auth.getName(), userId), "Đã gửi lời mời kết bạn!"));
    }

    @PostMapping("/{userId}/accept")
    public ResponseEntity<?> accept(@PathVariable String userId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                friendService.accept(auth.getName(), userId), "Đã chấp nhận kết bạn!"));
    }

    @PostMapping("/{userId}/reject")
    public ResponseEntity<?> reject(@PathVariable String userId, Authentication auth) {
        friendService.reject(auth.getName(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã từ chối"));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> remove(@PathVariable String userId, Authentication auth) {
        friendService.remove(auth.getName(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã hủy kết bạn"));
    }

    @GetMapping("/{userId}/status")
    public ResponseEntity<?> status(@PathVariable String userId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(friendService.getStatus(auth.getName(), userId)));
    }
}