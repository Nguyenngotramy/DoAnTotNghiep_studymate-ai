package com.studymate.controller;

import com.studymate.dto.*;
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
import java.util.List;
import java.util.Collections;

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
    public ResponseEntity<?> trending(Authentication auth) {
        String userId = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(ApiResponse.ok(postService.trending(userId)));
    }

    @GetMapping("/trending-tags")
    public ResponseEntity<?> trendingTags() {
        return ResponseEntity.ok(ApiResponse.ok(postService.getTrendingTags()));
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

    @PostMapping("/{id}/report")
    public ResponseEntity<?> report(@PathVariable String id, Authentication auth,
                                    @RequestBody(required = false) Map<String, String> body) {
        String reason = body == null ? "" : body.getOrDefault("reason", "");
        return ResponseEntity.ok(ApiResponse.ok(postService.report(id, auth.getName(), reason), "Đã báo cáo bài viết"));
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> share(
            @PathVariable String id,
            Authentication auth,
            @RequestBody(required = false) Map<String, List<String>> body
    ) {
        List<String> friendIds = body != null ? body.get("friendIds") : null;
        List<String> groupIds = body != null ? body.get("groupIds") : null;
        if (friendIds == null) friendIds = Collections.emptyList();
        if (groupIds == null) groupIds = Collections.emptyList();

        return ResponseEntity.ok(ApiResponse.ok(
                postService.share(id, auth.getName(), friendIds, groupIds), "Đã chia sẻ thành công!"));
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

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        postService.delete(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bài viết"));
    }
}
