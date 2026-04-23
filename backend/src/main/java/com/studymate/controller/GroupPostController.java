package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.dto.request.GroupPostRequest;
import com.studymate.service.GroupPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/groups/{groupId}/posts")
@RequiredArgsConstructor
public class GroupPostController {

    private final GroupPostService groupPostService;

    @GetMapping
    public ResponseEntity<?> list(@PathVariable String groupId, Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(groupPostService.getByGroup(groupId, auth.getName()))
        );
    }

    @GetMapping("/pending")
    public ResponseEntity<?> pending(@PathVariable String groupId, Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(groupPostService.getPendingPosts(groupId, auth.getName()))
        );
    }

    @GetMapping("/reported")
    public ResponseEntity<?> reported(@PathVariable String groupId, Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(groupPostService.getReportedPosts(groupId, auth.getName()))
        );
    }

    @PostMapping
    public ResponseEntity<?> create(
            @PathVariable String groupId,
            Authentication auth,
            @Valid @RequestBody GroupPostRequest req
    ) {
        var saved = groupPostService.create(groupId, auth.getName(), req);

        String message = saved.getStatus() == com.studymate.model.GroupPost.PostStatus.PENDING
                ? "Bài viết đã được gửi và đang chờ trưởng nhóm duyệt"
                : "Đăng bài trong nhóm thành công";

        return ResponseEntity.ok(ApiResponse.ok(saved, message));
    }

    @PostMapping("/{postId}/approve")
    public ResponseEntity<?> approve(
            @PathVariable String groupId,
            @PathVariable String postId,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        groupPostService.approvePost(groupId, postId, auth.getName()),
                        "Đã duyệt bài viết"
                )
        );
    }

    @PostMapping("/{postId}/reject")
    public ResponseEntity<?> reject(
            @PathVariable String groupId,
            @PathVariable String postId,
            Authentication auth,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body == null ? null : body.get("reason");
        return ResponseEntity.ok(
                ApiResponse.ok(
                        groupPostService.rejectPost(groupId, postId, auth.getName(), reason),
                        "Đã từ chối bài viết"
                )
        );
    }

    @PostMapping("/{postId}/hide")
    public ResponseEntity<?> hide(
            @PathVariable String groupId,
            @PathVariable String postId,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        groupPostService.hide(groupId, postId, auth.getName()),
                        "Đã ẩn bài viết"
                )
        );
    }

    @PostMapping("/{postId}/report")
    public ResponseEntity<?> report(
            @PathVariable String groupId,
            @PathVariable String postId,
            Authentication auth,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body == null ? null : body.get("reason");

        return ResponseEntity.ok(
                ApiResponse.ok(
                        groupPostService.report(groupId, postId, auth.getName(), reason),
                        "Đã gửi báo cáo tới trưởng nhóm"
                )
        );
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<?> like(
            @PathVariable String groupId,
            @PathVariable String postId,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(groupPostService.like(groupId, postId, auth.getName()))
        );
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable String groupId,
            @PathVariable String postId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        groupPostService.addComment(groupId, postId, auth.getName(), body.get("content")),
                        "Đã thêm bình luận"
                )
        );
    }

    @PostMapping("/{postId}/comments/{commentId}/reply")
    public ResponseEntity<?> replyComment(
            @PathVariable String groupId,
            @PathVariable String postId,
            @PathVariable String commentId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        groupPostService.replyComment(groupId, postId, commentId, auth.getName(), body.get("content")),
                        "Đã trả lời bình luận"
                )
        );
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<?> delete(
            @PathVariable String groupId,
            @PathVariable String postId,
            Authentication auth
    ) {
        groupPostService.delete(groupId, postId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bài viết"));
    }
}