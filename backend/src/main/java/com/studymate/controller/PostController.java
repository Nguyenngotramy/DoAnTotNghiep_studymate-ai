package com.studymate.controller;

import com.studymate.dto.*;
import com.studymate.dto.request.PostAiCheckRequest;
import com.studymate.dto.request.PostRequest;
import com.studymate.repository.PostRepository;
import com.studymate.repository.UserRepository;
import com.studymate.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final UserRepository userRepo;
    private final PostRepository postRepo;

    @GetMapping("/feed")
    public ResponseEntity<?> feed(Authentication auth,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(required = false) String tag) {
        String userId = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(ApiResponse.ok(postService.getFeed(userId, page, tag)));
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String tag) {
        return ResponseEntity.ok(ApiResponse.ok(postService.list(page, tag)));
    }

    @GetMapping("/trending")
    public ResponseEntity<?> trending() {
        return ResponseEntity.ok(ApiResponse.ok(postService.trending()));
    }

    @GetMapping("/trending-tags")
    public ResponseEntity<?> trendingTags() {
        return ResponseEntity.ok(ApiResponse.ok(postService.getTrendingTags()));
    }

    @GetMapping("/tags")
    public ResponseEntity<?> tags(@RequestParam(required = false, defaultValue = "") String search) {
        return ResponseEntity.ok(ApiResponse.ok(postService.searchTags(search)));
    }

    @PostMapping("/ai-check")
    public ResponseEntity<?> aiCheck(@RequestBody PostAiCheckRequest req) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(postService.aiCheck(req)));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("AI đang bận, bạn vẫn có thể đăng bài để hệ thống kiểm duyệt sau"));
        }
    }

    @GetMapping("/saved")
    public ResponseEntity<?> saved(Authentication auth,
                                   @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(ApiResponse.ok(postService.getSavedPosts(auth.getName(), page)));
    }

    @GetMapping("/hidden")
    public ResponseEntity<?> hidden(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(postService.getHiddenPosts(auth.getName())));
    }

    @GetMapping("/user/{authorId}")
    public ResponseEntity<?> byUser(@PathVariable String authorId) {
        return ResponseEntity.ok(ApiResponse.ok(
                postRepo.findByAuthorIdOrderByCreatedAtDesc(authorId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id, Authentication auth) {
        String userId = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(ApiResponse.ok(postService.trackView(id, userId)));
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication auth, @Valid @RequestBody PostRequest req) {
        var user = userRepo.findById(auth.getName()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.ok(
                postService.create(auth.getName(), user.getFullName(), req), "Đăng bài thành công!"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id,
                                    Authentication auth,
                                    @Valid @RequestBody PostRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(
                postService.update(id, auth.getName(), req), "Cập nhật bài viết thành công"));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<?> like(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(postService.like(id, auth.getName())));
    }

    @PostMapping("/{id}/save")
    public ResponseEntity<?> save(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(postService.save(id, auth.getName())));
    }

    @PostMapping("/{id}/hide")
    public ResponseEntity<?> hide(@PathVariable String id, Authentication auth) {
        postService.hidePost(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã ẩn bài viết"));
    }

    @PostMapping("/{id}/unhide")
    public ResponseEntity<?> unhide(@PathVariable String id, Authentication auth) {
        postService.unhidePost(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã bỏ ẩn bài viết"));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(@PathVariable String id, Authentication auth,
                                        @RequestBody Map<String, String> body) {
        var user = userRepo.findById(auth.getName()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.ok(
                postService.addComment(id, auth.getName(), user.getFullName(), body.get("content"))));
    }

    @PostMapping("/{id}/comments/{commentId}/reply")
    public ResponseEntity<?> replyComment(@PathVariable String id, @PathVariable String commentId, Authentication auth,
                                           @RequestBody Map<String, String> body) {
        var user = userRepo.findById(auth.getName()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.ok(
                postService.replyComment(id, commentId, auth.getName(), user.getFullName(), body.get("content"))));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable String id, @PathVariable String commentId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                postService.deleteComment(id, commentId, auth.getName())));
    }

    @PatchMapping("/{id}/comments/{commentId}")
    public ResponseEntity<?> editComment(@PathVariable String id, @PathVariable String commentId, Authentication auth,
                                         @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                postService.editComment(id, commentId, auth.getName(), body.get("content"))));
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> sharePost(
            @PathVariable String id,
            Authentication auth,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                postService.sharePost(
                        id,
                        auth.getName(),
                        body.get("targetType"),
                        body.get("targetUserId"),
                        body.get("targetGroupId"),
                        body.get("message")
                ),
                "Đã chia sẻ bài viết thành công"
        ));
    }

    @GetMapping("/{id}/shares")
    public ResponseEntity<?> getShares(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(postService.getShares(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        postService.delete(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bài viết"));
    }

    @PostMapping("/{id}/report")
    public ResponseEntity<?> report(@PathVariable String id, Authentication auth, @RequestBody Map<String, String> body) {
        var user = userRepo.findById(auth.getName()).orElseThrow();
        String reasonType = body.get("reasonType");
        String reasonText = body.get("reasonText");
        return ResponseEntity.ok(ApiResponse.ok(
                postService.reportPost(id, auth.getName(), user.getFullName(), reasonType, reasonText),
                "Báo cáo bài viết thành công"
        ));
    }

    @PostMapping("/{id}/resubmit")
    public ResponseEntity<?> resubmit(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                postService.resubmitPost(id, auth.getName()),
                "Đã gửi lại bài viết để AI duyệt lại"
        ));
    }

    @GetMapping("/my-pending")
    public ResponseEntity<?> myPending(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                postRepo.findRevisionPostsByAuthor(auth.getName())
        ));
    }
}