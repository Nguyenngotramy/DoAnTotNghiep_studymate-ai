package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.dto.request.GroupRequest;
import com.studymate.model.Group;
import com.studymate.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @GetMapping
    public ResponseEntity<?> myGroups(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(groupService.getMyGroups(auth.getName())));
    }

    @GetMapping("/public")
    public ResponseEntity<?> publicGroups() {
        return ResponseEntity.ok(ApiResponse.ok(groupService.getPublicGroups()));
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication auth, @Valid @RequestBody GroupRequest req) {
        return ResponseEntity.ok(
                ApiResponse.ok(groupService.create(auth.getName(), req), "Tạo nhóm thành công!")
        );
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<?> update(
            @PathVariable String groupId,
            Authentication auth,
            @Valid @RequestBody GroupRequest req
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        groupService.update(groupId, auth.getName(), req),
                        "Cập nhật nhóm thành công!"
                )
        );
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<?> get(@PathVariable String groupId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(groupService.getById(groupId, auth.getName())));
    }

    @PostMapping("/join")
    public ResponseEntity<?> join(Authentication auth, @RequestBody Map<String, String> body) {
        Map<String, Object> result = groupService.join(auth.getName(), body.get("inviteCode"));
        String message = String.valueOf(result.getOrDefault("message", "Xử lý tham gia nhóm thành công"));
        return ResponseEntity.ok(ApiResponse.ok(result, message));
    }

    @GetMapping("/{groupId}/join-requests")
    public ResponseEntity<?> pendingJoinRequests(@PathVariable String groupId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                groupService.getPendingJoinRequests(groupId, auth.getName())
        ));
    }

    @PostMapping("/{groupId}/join-requests/{userId}/approve")
    public ResponseEntity<?> approveJoinRequest(
            @PathVariable String groupId,
            @PathVariable String userId,
            Authentication auth
    ) {
        groupService.approveJoinRequest(groupId, auth.getName(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã duyệt yêu cầu tham gia"));
    }

    @PostMapping("/{groupId}/join-requests/{userId}/reject")
    public ResponseEntity<?> rejectJoinRequest(
            @PathVariable String groupId,
            @PathVariable String userId,
            Authentication auth
    ) {
        groupService.rejectJoinRequest(groupId, auth.getName(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã từ chối yêu cầu tham gia"));
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<?> leave(@PathVariable String groupId, Authentication auth) {
        groupService.leave(groupId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã rời nhóm"));
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<?> members(@PathVariable String groupId, Authentication auth) {
        Group g = groupService.getById(groupId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(g.getMembers()));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<?> removeMember(
            @PathVariable String groupId,
            @PathVariable String userId,
            Authentication auth
    ) {
        groupService.removeMember(groupId, auth.getName(), userId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá thành viên"));
    }

    @PatchMapping("/{groupId}/members/{userId}/role")
    public ResponseEntity<?> changeMemberRole(
            @PathVariable String groupId,
            @PathVariable String userId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        groupService.changeMemberRole(groupId, auth.getName(), userId, body.get("role"));
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã cập nhật vai trò thành viên"));
    }
}