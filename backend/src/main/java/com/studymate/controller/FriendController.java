package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @GetMapping("/suggestions")
    public ResponseEntity<?> suggestions(
            Authentication auth,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "10000") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(friendService.suggestions(auth.getName(), search, size))
        );
    }

    @GetMapping
    public ResponseEntity<?> friends(
            Authentication auth,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "10000") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(friendService.getFriends(auth.getName(), search, size))
        );
    }

    @GetMapping("/pending")
    public ResponseEntity<?> pending(
            Authentication auth,
            @RequestParam(defaultValue = "10000") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(friendService.getPending(auth.getName(), size))
        );
    }

    @PostMapping("/{userId}/request")
    public ResponseEntity<?> sendRequest(
            @PathVariable String userId,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        friendService.sendRequest(auth.getName(), userId),
                        "Đã gửi lời mời kết bạn!"
                )
        );
    }

    @PostMapping("/{userId}/accept")
    public ResponseEntity<?> accept(
            @PathVariable String userId,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        friendService.accept(auth.getName(), userId),
                        "Đã chấp nhận kết bạn!"
                )
        );
    }

    @PostMapping("/{userId}/reject")
    public ResponseEntity<?> reject(
            @PathVariable String userId,
            Authentication auth
    ) {
        friendService.reject(auth.getName(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã từ chối"));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> remove(
            @PathVariable String userId,
            Authentication auth
    ) {
        friendService.remove(auth.getName(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã hủy kết bạn/lời mời"));
    }

    @GetMapping("/{userId}/status")
    public ResponseEntity<?> status(
            @PathVariable String userId,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(friendService.getStatus(auth.getName(), userId))
        );
    }
}