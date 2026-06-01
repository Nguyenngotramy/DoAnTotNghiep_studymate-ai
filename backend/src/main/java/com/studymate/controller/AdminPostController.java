package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.Post;
import com.studymate.model.PostReport;
import com.studymate.model.User;
import com.studymate.model.UserWarning;
import com.studymate.repository.PostRepository;
import com.studymate.repository.PostReportRepository;
import com.studymate.repository.UserRepository;
import com.studymate.repository.UserWarningRepository;
import com.studymate.service.NotificationService;
import com.studymate.service.PostModerationEvaluator;
import com.studymate.service.PostService;
import com.studymate.service.UserWarningDisciplineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/admin/posts")
@RequiredArgsConstructor
public class AdminPostController {

    private final PostRepository postRepo;
    private final PostReportRepository postReportRepo;
    private final UserWarningRepository userWarningRepo;
    private final UserRepository userRepo;
    private final PostService postService;
    private final PostModerationEvaluator moderationEvaluator;
    private final NotificationService notificationService;
    private final UserWarningDisciplineService warningDisciplineService;

    @GetMapping("/moderation/counts")
    public ResponseEntity<?> moderationCounts() {
        long pending = postRepo.findPendingReviewCandidates().stream()
                .filter(moderationEvaluator::matchesPendingTab).count();
        long flagged = postRepo.findFlaggedCandidates().stream()
                .filter(moderationEvaluator::matchesFlaggedTab).count();
        long reported = postReportRepo.countByStatus("OPEN");
        long processed = postRepo.findProcessedCandidates().stream()
                .filter(moderationEvaluator::matchesProcessedTab).count();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "pending", pending,
                "flagged", flagged,
                "reported", reported,
                "processed", processed
        )));
    }

    @GetMapping("/moderation")
    public ResponseEntity<?> getModerationPosts(
            @RequestParam(required = false) String tab,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Post> result = findModerationPosts(tab, status, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports() {
        return ResponseEntity.ok(ApiResponse.ok(
                postReportRepo.findByStatusOrderByCreatedAtDesc("OPEN").stream()
                        .map(this::reportView)
                        .toList()
        ));
    }

    @GetMapping("/{postId}/moderation-detail")
    public ResponseEntity<?> moderationDetail(@PathVariable String postId) {
        Map<String, Object> data = new LinkedHashMap<>();
        Post post = postRepo.findById(postId).orElseThrow();
        data.put("post", postView(post));
        data.put("reports", postReportRepo.findByPostId(postId));
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @PostMapping("/rescan-media")
    public ResponseEntity<?> rescanMedia(@RequestParam(defaultValue = "30") int limit) {
        int updated = postService.rescanApprovedMediaPosts(Math.min(Math.max(limit, 1), 100));
        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("rescanned", updated),
                "Đã quét lại media cho " + updated + " bài viết"));
    }

    @PostMapping("/{postId}/remoderate-media")
    public ResponseEntity<?> remoderateMedia(@PathVariable String postId) {
        Post post = postService.remoderatePostMedia(postId);
        return ResponseEntity.ok(ApiResponse.ok(postView(post), "Đã kiểm duyệt lại media"));
    }

    @PostMapping("/normalize-legacy")
    public ResponseEntity<?> normalizeLegacy() {
        int fixed = postService.normalizeMisclassifiedPosts();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("fixed", fixed),
                "Đã chuẩn hóa " + fixed + " bài viết"));
    }

    @PatchMapping("/{postId}/approve")
    public ResponseEntity<?> approvePost(@PathVariable String postId, Authentication auth) {
        Post post = postRepo.findById(postId).orElseThrow();
        String adminId = auth.getName();
        post.setModerationStatus("APPROVED");
        post.setPublished(true);
        post.setReviewedByAdminId(adminId);
        post.setReviewedAt(Instant.now());
        post.setAuthorRevisionRequired(false);
        post.setRevisionMessage("");
        post.setModerationReason("");
        if (moderationEvaluator.hasMedia(post)) {
            post.setMediaSafetyStatus("SAFE");
            post.setMediaSafetyReason("Đã được admin duyệt thủ công.");
            post.setFlaggedImageUrls(new ArrayList<>());
            post.setMediaModeratedAt(Instant.now());
        }
        postRepo.save(post);
        closeOpenReports(postId, adminId, "REVIEWED");

        notificationService.send(
                post.getAuthorId(),
                "Bài viết đã được duyệt",
                "Bài viết \"" + post.getTitle() + "\" đã được duyệt và hiển thị trên feed.",
                "POST_APPROVED",
                "/blog",
                adminId
        );

        return ResponseEntity.ok(ApiResponse.ok(post, "Đã duyệt bài đăng thành công"));
    }

    @PatchMapping("/{postId}/reject")
    public ResponseEntity<?> rejectPost(@PathVariable String postId, Authentication auth, @RequestBody Map<String, String> body) {
        Post post = postRepo.findById(postId).orElseThrow();
        String reason = body.getOrDefault("reason", "Nội dung không phù hợp");
        String adminId = auth.getName();
        post.setModerationStatus("REJECTED");
        post.setPublished(false);
        post.setReviewedByAdminId(adminId);
        post.setReviewedAt(Instant.now());
        post.setModerationReason(reason);
        postRepo.save(post);
        closeOpenReports(postId, adminId, "REVIEWED");

        notificationService.send(
                post.getAuthorId(),
                "Bài viết bị từ chối",
                "Bài viết \"" + post.getTitle() + "\" bị từ chối vì: " + reason,
                "POST_REJECTED",
                "/blog",
                adminId
        );

        return ResponseEntity.ok(ApiResponse.ok(post, "Đã từ chối bài đăng"));
    }

    @PatchMapping("/{postId}/remove")
    public ResponseEntity<?> removePost(
            @PathVariable String postId,
            Authentication auth,
            @RequestBody(required = false) Map<String, String> body) {
        Post post = postRepo.findById(postId).orElseThrow();
        String reason = (body != null && body.containsKey("reason"))
                ? body.get("reason")
                : "Vi phạm tiêu chuẩn cộng đồng";
        String adminId = auth.getName();
        post.setModerationStatus("REMOVED");
        post.setPublished(false);
        post.setRemovedReason(reason);
        post.setReviewedByAdminId(adminId);
        post.setReviewedAt(Instant.now());
        post.setModerationReason(reason);
        postRepo.save(post);
        closeOpenReports(postId, adminId, "REVIEWED");

        notificationService.send(
                post.getAuthorId(),
                "Bài viết đã bị gỡ",
                "Bài viết \"" + post.getTitle() + "\" đã bị gỡ vì: " + reason,
                "POST_REMOVED",
                "/blog",
                adminId
        );

        return ResponseEntity.ok(ApiResponse.ok(post, "Đã gỡ bài viết vĩnh viễn"));
    }

    @PatchMapping("/{postId}/request-revision")
    public ResponseEntity<?> requestRevision(
            @PathVariable String postId,
            Authentication auth,
            @RequestBody Map<String, String> body) {
        Post post = postRepo.findById(postId).orElseThrow();
        String message = body.getOrDefault("message", "Vui lòng kiểm tra lại tag hoặc môn học chính.");
        String adminId = auth.getName();
        moderationEvaluator.applyNeedsRevisionState(post,
                "Admin yêu cầu chỉnh sửa: " + message, message);
        post.setReviewedByAdminId(adminId);
        post.setReviewedAt(Instant.now());
        postRepo.save(post);

        notificationService.send(
                post.getAuthorId(),
                "Bài viết cần chỉnh sửa",
                "Bài viết \"" + post.getTitle() + "\" cần chỉnh sửa: " + message,
                "POST_NEEDS_REVISION",
                "/blog",
                adminId
        );

        return ResponseEntity.ok(ApiResponse.ok(post, "Đã gửi yêu cầu chỉnh sửa cho tác giả"));
    }

    @PatchMapping("/reports/{reportId}/dismiss")
    public ResponseEntity<?> dismissReport(
            @PathVariable String reportId,
            Authentication auth,
            @RequestBody(required = false) Map<String, String> body) {
        PostReport report = postReportRepo.findById(reportId).orElseThrow();
        String adminId = auth.getName();
        String note = body != null ? body.get("reviewNote") : null;

        report.setStatus("DISMISSED");
        report.setReviewedByAdminId(adminId);
        report.setReviewedAt(Instant.now());
        if (note != null && !note.isBlank()) {
            report.setReviewNote(note);
        }
        postReportRepo.save(report);
        reevaluatePostAfterReportsClosed(report.getPostId());

        Post post = postRepo.findById(report.getPostId()).orElse(null);
        String postTitle = post != null ? post.getTitle() : "bài viết";

        notificationService.send(
                report.getReporterId(),
                "Báo cáo đã được xem xét",
                "Báo cáo của bạn về bài viết \"" + postTitle + "\" đã được admin xem xét.",
                "REPORT_DISMISSED",
                "/blog",
                adminId
        );

        return ResponseEntity.ok(ApiResponse.ok(reportView(report), "Đã bỏ qua báo cáo"));
    }

    @PostMapping("/users/{userId}/warnings")
    public ResponseEntity<?> warnUser(
            @PathVariable String userId,
            Authentication auth,
            @RequestBody Map<String, String> body) {

        String level = body.getOrDefault("level", "WARNING");
        String message = body.get("message");
        UserWarning warning = UserWarning.builder()
                .userId(userId)
                .postId(body.get("postId"))
                .level(level)
                .reason(body.get("reason"))
                .message(message)
                .createdByAdminId(auth.getName())
                .createdAt(Instant.now())
                .acknowledged(false)
                .build();

        userWarningRepo.save(warning);

        notificationService.send(
                userId,
                "Bạn nhận được cảnh cáo",
                "[" + level + "] - " + message,
                "USER_WARNING",
                "/notifications",
                auth.getName()
        );

        User user = userRepo.findById(userId).orElseThrow();
        UserWarningDisciplineService.DisciplineResult discipline =
                warningDisciplineService.evaluateAfterWarning(user, level);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("warning", warning);
        response.put("discipline", discipline.toMap());

        String msg = discipline.actionTaken()
                ? "Đã gửi cảnh cáo. " + discipline.message()
                : "Đã gửi cảnh cáo đến người dùng";

        return ResponseEntity.ok(ApiResponse.ok(response, msg));
    }

    private Page<Post> findModerationPosts(String tab, String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            return postRepo.findByModerationStatus(status, pageable);
        }

        String resolvedTab = tab == null || tab.isBlank() ? "pending" : tab;
        List<Post> candidates = switch (resolvedTab) {
            case "pending" -> postRepo.findPendingReviewCandidates();
            case "flagged" -> postRepo.findFlaggedCandidates();
            case "processed" -> postRepo.findProcessedCandidates();
            default -> List.of();
        };

        List<Post> filtered = candidates.stream()
                .filter(post -> switch (resolvedTab) {
                    case "pending" -> moderationEvaluator.matchesPendingTab(post);
                    case "flagged" -> moderationEvaluator.matchesFlaggedTab(post);
                    case "processed" -> moderationEvaluator.matchesProcessedTab(post);
                    default -> false;
                })
                .sorted(Comparator.comparing(Post::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        int from = Math.min((int) pageable.getOffset(), filtered.size());
        int to = Math.min(from + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(from, to), pageable, filtered.size());
    }

    private Map<String, Object> reportView(PostReport report) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", report.getId());
        data.put("reportId", report.getId());
        data.put("postId", report.getPostId());
        data.put("reporterId", report.getReporterId());
        data.put("reporterName", report.getReporterName());
        data.put("reasonType", report.getReasonType());
        data.put("reasonText", report.getReasonText());
        data.put("status", report.getStatus());
        data.put("reportStatus", report.getStatus());
        data.put("createdAt", report.getCreatedAt());
        data.put("reviewedAt", report.getReviewedAt());
        data.put("reviewedByAdminId", report.getReviewedByAdminId());
        data.put("reviewNote", report.getReviewNote());

        postRepo.findById(report.getPostId()).ifPresentOrElse(
                post -> data.put("post", postView(post)),
                () -> data.put("post", null)
        );
        return data;
    }

    private Map<String, Object> postView(Post post) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", post.getId());
        p.put("authorId", post.getAuthorId());
        p.put("authorName", post.getAuthorName());
        p.put("title", post.getTitle());
        p.put("content", post.getContent());
        p.put("subject", post.getSubject());
        p.put("tags", post.getTags() != null ? post.getTags() : List.of());
        p.put("imageUrls", post.getImageUrls() != null ? post.getImageUrls() : List.of());
        p.put("videoUrl", post.getVideoUrl());
        p.put("moderationStatus", post.getModerationStatus());
        p.put("published", post.isPublished());
        p.put("aiSummary", post.getAiSummary());
        p.put("aiSummaryStatus", post.getAiSummaryStatus());
        p.put("aiDetectedSubject", post.getAiDetectedSubject());
        p.put("aiSuggestedTags", post.getAiTagSuggestion());
        p.put("aiTagSuggestion", post.getAiTagSuggestion());
        p.put("aiTagConfidence", post.getAiTagConfidence());
        p.put("aiSafetyStatus", post.getAiSafetyStatus());
        p.put("aiSafetyReason", post.getAiSafetyReason());
        p.put("mediaSafetyStatus", post.getMediaSafetyStatus());
        p.put("mediaSafetyReason", post.getMediaSafetyReason());
        p.put("flaggedImageUrls", post.getFlaggedImageUrls() != null ? post.getFlaggedImageUrls() : List.of());
        p.put("mediaModeratedAt", post.getMediaModeratedAt());
        p.put("createdAt", post.getCreatedAt());
        return p;
    }

    private void closeOpenReports(String postId, String adminId, String status) {
        List<PostReport> reports = postReportRepo.findByPostId(postId);
        Instant now = Instant.now();
        reports.stream()
                .filter(r -> "OPEN".equals(r.getStatus()))
                .forEach(r -> {
                    r.setStatus(status);
                    r.setReviewedByAdminId(adminId);
                    r.setReviewedAt(now);
                });
        postReportRepo.saveAll(reports);
        reevaluatePostAfterReportsClosed(postId);
    }

    /** If no open reports remain and AI says SAFE, restore public approved state (legacy tolerance). */
    private void reevaluatePostAfterReportsClosed(String postId) {
        postRepo.findById(postId).ifPresent(post -> {
            if (moderationEvaluator.countOpenReports(postId) > 0) return;
            if (!moderationEvaluator.isAutoApprovable(post)) return;
            if ("REMOVED".equalsIgnoreCase(post.getModerationStatus())
                    || "REJECTED".equalsIgnoreCase(post.getModerationStatus())) {
                return;
            }
            moderationEvaluator.applyAutoApprovedState(post);
            postRepo.save(post);
        });
    }
}
