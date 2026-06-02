package com.studymate.service;

import com.studymate.dto.PageResponse;
import com.studymate.dto.PostAiCheckResponse;
import com.studymate.dto.request.PostAiCheckRequest;
import com.studymate.dto.request.PostRequest;
import com.studymate.model.Post;
import com.studymate.model.PostReport;
import com.studymate.model.UserWarning;
import com.studymate.model.User;
import com.studymate.model.PostShare;
import com.studymate.repository.PostRepository;
import com.studymate.repository.UserRepository;
import com.studymate.repository.PostReportRepository;
import com.studymate.repository.UserWarningRepository;
import com.studymate.repository.PostShareRepository;
import com.studymate.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    private final PostRepository postRepo;
    private final UserRepository userRepo;
    private final PostReportRepository postReportRepo;
    private final UserWarningRepository userWarningRepo;
    private final PostShareRepository postShareRepo;
    private final GroupRepository groupRepo;
    private final OpenAiModerationService openAiModerationService;
    private final NotificationService notificationService;
    private final PostModerationEvaluator moderationEvaluator;
    private final MediaModerationService mediaModerationService;

    public PageResponse<Post> getFeed(String userId, int page) {
        return getFeed(userId, page, null);
    }

    public PageResponse<Post> getFeed(String userId, int page, String tagFilter) {
        int size = 10;
        User user = userRepo.findById(userId != null ? userId : "").orElse(null);

        Pageable pool = PageRequest.of(0, 500, Sort.by("createdAt").descending());
        
        // Lấy toàn bộ bài đăng được phép hiển thị lên bảng tin công cộng
        List<Post> allRaw = postRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        Set<String> hiddenIds = new HashSet<>();
        if (user != null && user.getHiddenPostIds() != null) {
            hiddenIds.addAll(user.getHiddenPostIds());
        }

        List<Post> visiblePool = allRaw.stream()
                .filter(p -> {
                    boolean isMine = userId != null && userId.equals(p.getAuthorId());
                    if (hiddenIds.contains(p.getId())) return false;
                    if (isMine) {
                        return !"REMOVED".equalsIgnoreCase(nullToEmpty(p.getModerationStatus()));
                    }
                    return moderationEvaluator.isPublicFeedEligible(p);
                })
                .collect(Collectors.toList());

        List<Post> all = (tagFilter != null && !tagFilter.isBlank())
                ? visiblePool.stream()
                .filter(p -> postMatchesTagOrSubject(p, tagFilter))
                .collect(Collectors.toList())
                : visiblePool;

        if (user == null || user.getTagViewCount() == null || user.getTagViewCount().isEmpty()) {
            int from = page * size;
            List<Post> slice = all.stream().skip(from).limit(size).collect(Collectors.toList());
            int totalPages = (int) Math.ceil(all.size() / (double) size);
            return buildPage(slice, page, size, totalPages, all.size());
        }

        Map<String, Integer> tagScore = user.getTagViewCount();
        Set<String> viewedIds = new HashSet<>(
                user.getViewedPostIds() != null ? user.getViewedPostIds() : Collections.emptyList()
        );

        List<Post> unseen = all.stream().filter(p -> !viewedIds.contains(p.getId())).collect(Collectors.toList());
        List<Post> seen = all.stream().filter(p -> viewedIds.contains(p.getId())).collect(Collectors.toList());

        Comparator<Post> byScore = (a, b) -> {
            int diff = scorePost(b, tagScore) - scorePost(a, tagScore);
            return diff != 0 ? diff : b.getCreatedAt().compareTo(a.getCreatedAt());
        };

        List<Post> ranked = new ArrayList<>();
        ranked.addAll(unseen.stream().sorted(byScore).collect(Collectors.toList()));
        ranked.addAll(seen.stream().sorted(byScore).collect(Collectors.toList()));

        int from = page * size;
        if (from >= ranked.size()) return buildPage(Collections.emptyList(), page, size, page, 0);

        List<Post> slice = ranked.stream().skip(from).limit(size).collect(Collectors.toList());
        int totalPages = (int) Math.ceil(ranked.size() / (double) size);
        return buildPage(slice, page, size, totalPages, ranked.size());
    }

    private int scorePost(Post post, Map<String, Integer> tagScore) {
        int score = 0;

        if (post.getTags() != null) {
            for (String tag : post.getTags()) {
                String t = tag.toLowerCase().trim();
                score += tagScore.getOrDefault(t, 0);
            }
        }

        if (post.getCreatedAt() != null &&
                post.getCreatedAt().isAfter(Instant.now().minusSeconds(172800))) {
            score += 3;
        }

        int likeBoost = Math.min(post.getLikesCount() / 5, 10);
        int commentBoost = Math.min(post.getCommentsCount() / 3, 10);
        int saveBoost = Math.min(post.getSavedBy() != null ? post.getSavedBy().size() / 2 : 0, 10);

        score += likeBoost + commentBoost + saveBoost;
        return score;
    }

    public Post trackView(String postId, String userId) {
        Post post = postRepo.findById(postId).orElseThrow();
        post.setViews(post.getViews() + 1);
        postRepo.save(post);

        if (userId != null && !userId.isEmpty()) {
            userRepo.findById(userId).ifPresent(user -> {
                Map<String, Integer> tagCount = user.getTagViewCount();
                if (tagCount == null) tagCount = new HashMap<>();

                for (String tag : post.getTags()) {
                    tagCount.merge(tag.toLowerCase().trim(), 1, Integer::sum);
                }
                user.setTagViewCount(tagCount);

                List<String> viewed = user.getViewedPostIds();
                if (viewed == null) viewed = new ArrayList<>();
                if (!viewed.contains(postId)) {
                    viewed.add(0, postId);
                    if (viewed.size() > 200) viewed = viewed.subList(0, 200);
                }
                user.setViewedPostIds(viewed);
                userRepo.save(user);
            });
        }

        return post;
    }

    public PageResponse<Post> list(int page, String tag) {
        int size = 10;
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        Page<Post> result;
        if (tag != null && !tag.isBlank()) {
            List<Post> filtered = postRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                    .filter(moderationEvaluator::isPublicFeedEligible)
                    .filter(p -> postMatchesTagOrSubject(p, tag))
                    .collect(Collectors.toList());

            int from = Math.min(page * size, filtered.size());
            int to = Math.min(from + size, filtered.size());
            int totalPages = (int) Math.ceil(filtered.size() / (double) size);
            return buildPage(filtered.subList(from, to), page, size, totalPages, filtered.size());
        } else {
            result = postRepo.findActivePosts(pageable);
            List<Post> eligible = result.getContent().stream()
                    .filter(moderationEvaluator::isPublicFeedEligible)
                    .collect(Collectors.toList());
            return buildPage(eligible, page, size, result.getTotalPages(), eligible.size());
        }
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private boolean postMatchesTagOrSubject(Post post, String tagFilter) {
        String target = normalizeVietnamese(tagFilter);
        if (target.isBlank() || target.equals(normalizeVietnamese("Tất cả"))) return true;

        if (moderationEvaluator.subjectsMatch(post.getSubject(), tagFilter)) return true;

        if (post.getTags() == null) return false;
        return post.getTags().stream().anyMatch(tag -> moderationEvaluator.subjectsMatch(tag, tagFilter));
    }

    public List<Post> trending() {
        return postRepo.findAll().stream()
                .filter(moderationEvaluator::isPublicFeedEligible)
                .sorted((a, b) -> Integer.compare(trendingScore(b), trendingScore(a)))
                .limit(10)
                .collect(Collectors.toList());
    }

    private int trendingScore(Post p) {
        int likes = p.getLikesCount() * 3;
        int comments = p.getCommentsCount() * 5;
        int saves = (p.getSavedBy() != null ? p.getSavedBy().size() : 0) * 4;
        int views = p.getViews();

        int recency = 0;
        if (p.getCreatedAt() != null) {
            if (p.getCreatedAt().isAfter(Instant.now().minusSeconds(86400))) recency += 20;
            else if (p.getCreatedAt().isAfter(Instant.now().minusSeconds(3 * 86400))) recency += 10;
        }

        return likes + comments + saves + views + recency;
    }

    public List<Map<String, Object>> getTrendingTags() {
        return aggregateTags(null, 20);
    }

    public List<Map<String, Object>> searchTags(String search) {
        return aggregateTags(search, 30);
    }

    private List<Map<String, Object>> aggregateTags(String search, int limit) {
        List<Post> recent = postRepo.findAll();

        Map<String, Integer> tagCount = new HashMap<>();
        Map<String, String> displayCase = new HashMap<>();

        for (Post p : recent) {
            if (p.getModerationStatus() != null && !p.getModerationStatus().equals("APPROVED")) {
                continue;
            }
            if (p.getTags() == null) continue;
            for (String t : p.getTags()) {
                if (t == null || t.isBlank()) continue;
                String key = t.toLowerCase().trim();
                tagCount.merge(key, 1, Integer::sum);
                displayCase.putIfAbsent(key, t.trim());
            }
        }

        String normalizedSearch = normalizeVietnamese(search);

        return tagCount.entrySet().stream()
                .filter(e -> {
                    if (normalizedSearch == null || normalizedSearch.isBlank()) return true;
                    String tagText = normalizeVietnamese(displayCase.get(e.getKey()));
                    return tagText.contains(normalizedSearch);
                })
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(limit)
                .map(e -> Map.<String, Object>of(
                        "tag", displayCase.get(e.getKey()),
                        "count", e.getValue()
                ))
                .collect(Collectors.toList());
    }

    public PostAiCheckResponse aiCheck(PostAiCheckRequest req) {
        String title = req.getTitle() != null ? req.getTitle().trim() : "";
        String content = req.getContent() != null ? req.getContent().trim() : "";
        String subject = req.getSubject() != null && !req.getSubject().isBlank() ? req.getSubject().trim() : "Khác";
        List<String> tags = req.getTags() != null ? req.getTags() : new ArrayList<>();

        OpenAiModerationService.ModerationResult aiResult = openAiModerationService.moderatePreCheck(
                title, content, subject, tags
        );

        boolean tagMatch = moderationEvaluator.computeTagMatch(subject, tags, aiResult.detectedSubject, aiResult.tagConfidence);
        String message = buildAiCheckMessage(aiResult, tagMatch, subject);

        return PostAiCheckResponse.builder()
                .detectedSubject(aiResult.detectedSubject != null ? aiResult.detectedSubject : "")
                .suggestedTags(aiResult.suggestedTags != null ? aiResult.suggestedTags : new ArrayList<>())
                .tagMatch(tagMatch)
                .tagConfidence(aiResult.tagConfidence)
                .safetyStatus(aiResult.safetyStatus)
                .safetyReason(aiResult.safetyReason != null ? aiResult.safetyReason : "")
                .message(message)
                .build();
    }

    private String buildAiCheckMessage(OpenAiModerationService.ModerationResult aiResult, boolean tagMatch, String subject) {
        if ("VIOLATION".equalsIgnoreCase(aiResult.safetyStatus)) {
            return "Nội dung có thể vi phạm tiêu chuẩn cộng đồng: " + aiResult.safetyReason;
        }
        if ("WARNING".equalsIgnoreCase(aiResult.safetyStatus)) {
            return "AI cảnh báo: " + (aiResult.safetyReason != null && !aiResult.safetyReason.isBlank()
                    ? aiResult.safetyReason
                    : "Nội dung cần xem xét thêm trước khi đăng.");
        }
        if (!tagMatch) {
            return "Nội dung có vẻ thuộc môn " + aiResult.detectedSubject
                    + " hơn môn " + subject + " hiện tại. Hãy kiểm tra lại tag/môn học.";
        }
        return "Môn học và nội dung khớp nhau. Bạn có thể đăng bài.";
    }

    private String normalizeVietnamese(String value) {
        return moderationEvaluator.normalizeVietnamese(value);
    }

    public Post get(String id) {
        return postRepo.findById(id).orElseThrow();
    }

    public Post create(String authorId, String authorName, PostRequest req) {
        User author = userRepo.findById(authorId).orElse(null);

        Post post = Post.builder()
                .authorId(authorId)
                .authorName(authorName)
                .authorAvatar(author != null ? author.getAvatar() : null)
                .title(req.getTitle())
                .content(req.getContent())
                .subject(req.getSubject())
                .tags(req.getTags() != null ? req.getTags() : new ArrayList<>())
                .imageUrls(req.getImageUrls() != null ? req.getImageUrls() : new ArrayList<>())
                .videoUrl(req.getVideoUrl())
                .coverImage(req.getCoverImage())
                .summary(req.getSummary())
                .aiSummaryStatus("PENDING")
                .published(false)
                .build();

        post = postRepo.save(post);

        // Chạy AI moderation và tóm tắt ngầm
        triggerAiModeration(post);

        return post;
    }

    public Post update(String id, String userId, PostRequest req) {
        final Post post = postRepo.findById(id).orElseThrow();

        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền sửa bài viết này");
        }

        userRepo.findById(userId).ifPresent(user -> post.setAuthorAvatar(user.getAvatar()));

        post.setTitle(req.getTitle());
        post.setContent(req.getContent());
        post.setSubject(req.getSubject());
        post.setTags(req.getTags() != null ? req.getTags() : new ArrayList<>());
        post.setImageUrls(req.getImageUrls() != null ? req.getImageUrls() : new ArrayList<>());
        post.setVideoUrl(req.getVideoUrl());
        post.setCoverImage(req.getCoverImage());
        post.setSummary(req.getSummary());

        Post savedPost = postRepo.save(post);

        // Chạy lại AI Moderation khi cập nhật nội dung
        triggerAiModeration(savedPost);

        return savedPost;
    }

    public void triggerAiModeration(Post post) {
        try {
            MediaModerationService.MediaModerationResult mediaResult = null;
            boolean hasMedia = mediaModerationService.hasMedia(post.getImageUrls(), post.getVideoUrl());

            // 1. Kiểm media TRƯỚC — chặn ảnh 18+ ngay khi user đăng (đồng bộ, không cần admin quét lại)
            if (hasMedia) {
                mediaResult = mediaModerationService.moderatePostMedia(
                        post.getImageUrls(),
                        post.getVideoUrl(),
                        post.getTitle(),
                        post.getContent()
                );
                post.setMediaSafetyStatus(mediaResult.mediaSafetyStatus);
                post.setMediaSafetyReason(mediaResult.mediaSafetyReason);
                post.setFlaggedImageUrls(mediaResult.flaggedImageUrls != null
                        ? new ArrayList<>(mediaResult.flaggedImageUrls)
                        : new ArrayList<>());
                post.setMediaModeratedAt(Instant.now());
            } else {
                post.setMediaSafetyStatus("SAFE");
                post.setMediaSafetyReason("");
                post.setFlaggedImageUrls(new ArrayList<>());
                post.setMediaModeratedAt(Instant.now());
            }

            // 2. Kiểm text + tóm tắt
            OpenAiModerationService.ModerationResult aiResult = openAiModerationService.moderateAndSummarize(
                    post.getTitle(),
                    post.getContent(),
                    post.getSubject(),
                    post.getTags()
            );

            boolean tooShort = openAiModerationService.isContentTooShortForSummary(post.getContent());
            boolean aiUnavailable = isAiUnavailable(aiResult);

            if (tooShort) {
                post.setAiSummary(OpenAiModerationService.SHORT_CONTENT_SUMMARY);
                post.setAiSummaryStatus("DONE");
            } else if (aiUnavailable || aiResult.summary == null || aiResult.summary.isBlank()) {
                post.setAiSummary("");
                post.setAiSummaryStatus("FAILED");
            } else {
                post.setAiSummary(aiResult.summary);
                post.setAiSummaryStatus("DONE");
            }
            post.setAiSummaryUpdatedAt(Instant.now());

            post.setAiDetectedSubject(aiResult.detectedSubject);
            post.setAiTagConfidence(moderationEvaluator.normalizeConfidence(aiResult.tagConfidence));
            post.setAiTagSuggestion(aiResult.suggestedTags);
            post.setAiSafetyStatus(aiResult.safetyStatus);
            post.setAiSafetyReason(aiResult.safetyReason);

            // Hạ confidence nếu nội dung spam/ký tự lặp — tránh hiển thị 95% Lập trình oan
            moderationEvaluator.applyTextQualityAdjustments(post);

            // 3. Quyết định publish
            applyModerationDecision(post, aiResult, mediaResult, aiUnavailable);
            postRepo.save(post);
        } catch (Exception e) {
            log.error("Lỗi khi chạy AI Moderation cho bài viết " + post.getId(), e);
            post.setAiSummaryStatus("FAILED");
            post.setAiSummary("");
            if (mediaModerationService.hasMedia(post.getImageUrls(), post.getVideoUrl())) {
                post.setMediaSafetyStatus("UNKNOWN");
                post.setMediaSafetyReason("Lỗi kiểm duyệt media, cần admin xem xét.");
            }
            moderationEvaluator.applyPendingReviewState(post, "AI chưa khả dụng, cần admin kiểm duyệt thủ công.");
            postRepo.save(post);
        }
    }

    private void applyModerationDecision(
            Post post,
            OpenAiModerationService.ModerationResult aiResult,
            MediaModerationService.MediaModerationResult mediaResult,
            boolean aiUnavailable
    ) {
        long openReports = moderationEvaluator.countOpenReports(post.getId());

        if (aiUnavailable) {
            moderationEvaluator.applyPendingReviewState(post, "AI chưa khả dụng, cần admin kiểm duyệt thủ công.");
            return;
        }

        if (openReports > 0) {
            moderationEvaluator.applyPendingReviewState(post,
                    "Bài viết có " + openReports + " báo cáo đang chờ xử lý.");
            return;
        }

        if (mediaModerationService.hasMedia(post.getImageUrls(), post.getVideoUrl()) && mediaResult != null) {
            String mediaStatus = nullToEmpty(mediaResult.mediaSafetyStatus);

            if ("UNKNOWN".equalsIgnoreCase(mediaStatus) || mediaStatus.isBlank()) {
                moderationEvaluator.applyPendingReviewState(post,
                        "Bài viết có media cần kiểm duyệt trước khi hiển thị.");
                return;
            }
            if ("VIOLATION".equalsIgnoreCase(mediaStatus)) {
                String reason = mediaResult.mediaSafetyReason != null && !mediaResult.mediaSafetyReason.isBlank()
                        ? mediaResult.mediaSafetyReason
                        : "Media vi phạm tiêu chuẩn cộng đồng.";
                moderationEvaluator.applyRejectedState(post, "Media vi phạm tiêu chuẩn cộng đồng: " + reason);
                notifyAdminsNewFlaggedPost(post, "Media vi phạm: " + reason);
                notificationService.send(
                        post.getAuthorId(),
                        "Bài viết đã bị gỡ",
                        "Bài viết \"" + post.getTitle() + "\" không được hiển thị vì: " + reason,
                        "POST_REMOVED",
                        "/blog"
                );
                return;
            }
            if ("WARNING".equalsIgnoreCase(mediaStatus)) {
                moderationEvaluator.applyPendingReviewState(post,
                        mediaResult.mediaSafetyReason != null && !mediaResult.mediaSafetyReason.isBlank()
                                ? mediaResult.mediaSafetyReason
                                : "Media có thể không phù hợp với môi trường học tập.");
                return;
            }
        }

        if ("VIOLATION".equalsIgnoreCase(aiResult.safetyStatus)) {
            moderationEvaluator.applyPendingReviewState(post,
                    "AI phát hiện vi phạm tiêu chuẩn cộng đồng: " + aiResult.safetyReason);
            notificationService.send(
                    post.getAuthorId(),
                    "Bài viết cần được kiểm duyệt",
                    "Bài viết \"" + post.getTitle() + "\" đang được kiểm duyệt: " + aiResult.safetyReason,
                    "POST_NEEDS_REVISION",
                    "/blog"
            );
            return;
        }

        double normalizedConf = moderationEvaluator.normalizeConfidence(aiResult.tagConfidence);
        boolean tagMatch = moderationEvaluator.computeTagMatch(
                post.getSubject(), post.getTags(), aiResult.detectedSubject, normalizedConf);
        boolean lowConfidence = normalizedConf < PostModerationEvaluator.MIN_AUTO_APPROVE_CONFIDENCE;
        boolean warning = "WARNING".equalsIgnoreCase(aiResult.safetyStatus);
        boolean canAutoApprove = "SAFE".equalsIgnoreCase(aiResult.safetyStatus)
                && !lowConfidence
                && tagMatch
                && !warning
                && moderationEvaluator.isMediaSafeForPublic(post);

        if (canAutoApprove) {
            moderationEvaluator.applyAutoApprovedState(post);
        } else if (warning || !tagMatch || lowConfidence) {
            String reason = warning && aiResult.safetyReason != null && !aiResult.safetyReason.isBlank()
                    ? aiResult.safetyReason
                    : "Môn học/tag không khớp nội dung (AI phát hiện: " + aiResult.detectedSubject + ")";
            String revisionMsg = "Nội dung cần kiểm tra lại. AI phát hiện: "
                    + aiResult.detectedSubject + ", độ tin cậy: "
                    + Math.round(normalizedConf * 100) + "%.";
            moderationEvaluator.applyNeedsRevisionState(post, reason, revisionMsg);
            notifyAdminsNewFlaggedPost(post, reason);
            notificationService.send(
                    post.getAuthorId(),
                    "Bài viết cần chỉnh sửa",
                    "Bài viết \"" + post.getTitle() + "\" cần chỉnh sửa: " + revisionMsg,
                    "POST_NEEDS_REVISION",
                    "/blog"
            );
        } else {
            moderationEvaluator.applyPendingReviewState(post, "Cần admin xem xét thêm.");
        }
    }

    private void notifyAdminsNewFlaggedPost(Post post, String reason) {
        if (post == null) return;
        List<User> admins = userRepo.findByRole(User.Role.ADMIN);
        if (admins == null) return;
        String title = post.getTitle() != null ? post.getTitle() : "Bài viết";
        for (User admin : admins) {
            notificationService.send(
                    admin.getId(),
                    "AI cảnh báo bài viết mới",
                    "Bài \"" + title + "\" cần admin xem xét: " + reason,
                    "POST_AI_FLAGGED",
                    "/admin/posts?tab=flagged",
                    post.getAuthorId()
            );
        }
    }

    /** Chỉ heal bài cũ published=true, chưa có moderationStatus — nhanh, gọi lúc startup. */
    public int healLegacyPublishedPostsOnly() {
        int fixed = 0;
        for (Post post : postRepo.findLegacyPublishedWithoutStatus()) {
            if (healLegacyPublishedPost(post)) {
                postRepo.save(post);
                fixed++;
            }
        }
        return fixed;
    }

    /**
     * Fixes legacy rows that are SAFE + high confidence but stuck in admin queues.
     */
    public int normalizeMisclassifiedPosts() {
        int fixed = 0;
        for (Post post : postRepo.findLegacyPublishedWithoutStatus()) {
            if (healLegacyPublishedPost(post)) {
                postRepo.save(post);
                fixed++;
            }
        }
        for (Post post : postRepo.findAll()) {
            if (moderationEvaluator.healIfMisclassified(post)) {
                postRepo.save(post);
                fixed++;
            }
        }
        return fixed;
    }

    /** Bài cũ published=true nhưng chưa có trạng thái moderation — cho phép mọi người thấy trên feed. */
    private boolean healLegacyPublishedPost(Post post) {
        if (post == null || !post.isPublished()) return false;
        if (moderationEvaluator.hasBlockingMedia(post)) return false;
        String status = nullToEmpty(post.getModerationStatus());
        if (!status.isBlank()) return false;
        moderationEvaluator.applyAutoApprovedState(post);
        return true;
    }

    /** Re-run vision moderation on published APPROVED posts that still have media (fixes false SAFE). */
    public int rescanApprovedMediaPosts(int limit) {
        List<Post> targets = postRepo.findApprovedPublishedWithMedia().stream()
                .sorted(Comparator.comparing(Post::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .toList();
        int updated = 0;
        for (Post post : targets) {
            try {
                remoderatePostMediaInternal(post);
                updated++;
            } catch (Exception e) {
                log.warn("Rescan media failed for post {}: {}", post.getId(), e.getMessage());
            }
        }
        return updated;
    }

    public Post remoderatePostMedia(String postId) {
        Post post = postRepo.findById(postId).orElseThrow();
        remoderatePostMediaInternal(post);
        return postRepo.findById(postId).orElseThrow();
    }

    private void remoderatePostMediaInternal(Post post) {
        if (!mediaModerationService.hasMedia(post.getImageUrls(), post.getVideoUrl())) {
            return;
        }
        OpenAiModerationService.ModerationResult aiResult = new OpenAiModerationService.ModerationResult();
        aiResult.detectedSubject = post.getAiDetectedSubject() != null ? post.getAiDetectedSubject() : "Khác";
        aiResult.tagConfidence = post.getAiTagConfidence();
        aiResult.safetyStatus = post.getAiSafetyStatus() != null ? post.getAiSafetyStatus() : "SAFE";
        aiResult.safetyReason = post.getAiSafetyReason() != null ? post.getAiSafetyReason() : "";
        aiResult.suggestedTags = post.getAiTagSuggestion() != null
                ? new ArrayList<>(post.getAiTagSuggestion())
                : new ArrayList<>();

        MediaModerationService.MediaModerationResult mediaResult = mediaModerationService.moderatePostMedia(
                post.getImageUrls(),
                post.getVideoUrl(),
                post.getTitle(),
                post.getContent()
        );
        post.setMediaSafetyStatus(mediaResult.mediaSafetyStatus);
        post.setMediaSafetyReason(mediaResult.mediaSafetyReason);
        post.setFlaggedImageUrls(mediaResult.flaggedImageUrls != null
                ? new ArrayList<>(mediaResult.flaggedImageUrls)
                : new ArrayList<>());
        post.setMediaModeratedAt(Instant.now());
        moderationEvaluator.applyTextQualityAdjustments(post);
        applyModerationDecision(post, aiResult, mediaResult, false);
        postRepo.save(post);
    }

    private boolean isAiUnavailable(OpenAiModerationService.ModerationResult aiResult) {
        if (aiResult == null) return true;
        String reason = aiResult.safetyReason != null ? normalizeVietnamese(aiResult.safetyReason) : "";
        return aiResult.tagConfidence <= 0.0
                && "WARNING".equalsIgnoreCase(aiResult.safetyStatus)
                && (reason.contains("ai") || reason.contains("api") || reason.contains("credit")
                || reason.contains("token") || reason.contains("key"));
    }

    public PostReport reportPost(String postId, String reporterId, String reporterName, String reasonType, String reasonText) {
        boolean exists = postReportRepo.existsByPostIdAndReporterIdAndReasonType(postId, reporterId, reasonType);
        if (exists) {
            throw new RuntimeException("Bạn đã báo cáo bài viết này với cùng một lý do!");
        }

        PostReport report = PostReport.builder()
                .postId(postId)
                .reporterId(reporterId)
                .reporterName(reporterName)
                .reasonType(reasonType)
                .reasonText(reasonText)
                .status("OPEN")
                .createdAt(Instant.now())
                .build();

        postReportRepo.save(report);

        // Gửi thông báo cho tất cả admin
        Post post = postRepo.findById(postId).orElse(null);
        String postTitle = post != null ? post.getTitle() : "không rõ tiêu đề";
        List<User> admins = userRepo.findByRole(User.Role.ADMIN);
        if (admins != null) {
            for (User admin : admins) {
                notificationService.send(
                    admin.getId(),
                    "Có báo cáo bài viết mới",
                    reporterName + " đã báo cáo bài viết \"" + postTitle + "\" với lý do \"" + reasonType + "\".",
                    "POST_REPORTED",
                    "/admin/posts?tab=reported",
                    reporterId
                );
            }
        }

        // Tự động kiểm tra ngưỡng reports để ẩn bài
        long openReports = postReportRepo.countByPostIdAndStatus(postId, "OPEN");
        if (openReports >= 3) {
            if (post != null) {
                post.setModerationStatus("PENDING_REVIEW");
                post.setModerationReason("Bài đăng nhận " + openReports + " lượt báo cáo vi phạm cộng đồng.");
                postRepo.save(post);
            }
        }

        return report;
    }

    public Post resubmitPost(String postId, String userId) {
        Post post = postRepo.findById(postId).orElseThrow();
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền gửi duyệt lại bài viết này");
        }

        post.setAuthorRevisionRequired(false);
        post.setRevisionMessage("");
        postRepo.save(post);

        triggerAiModeration(post);
        return post;
    }

    public Post like(String id, String userId) {
        Post post = postRepo.findById(id).orElseThrow();
        if (post.getLikedBy().contains(userId)) {
            post.getLikedBy().remove(userId);
        } else {
            post.getLikedBy().add(userId);
            updateUserTagScore(userId, post.getTags(), 3);
        }
        return postRepo.save(post);
    }

    public Post save(String id, String userId) {
        Post post = postRepo.findById(id).orElseThrow();
        if (post.getSavedBy().contains(userId)) {
            post.getSavedBy().remove(userId);
        } else {
            post.getSavedBy().add(userId);
            updateUserTagScore(userId, post.getTags(), 5);
        }
        return postRepo.save(post);
    }

    public PageResponse<Post> getSavedPosts(String userId, int page) {
        int size = 10;
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Post> result = postRepo.findSavedPostsByUserId(userId, pageable);
        return buildPage(result.getContent(), page, size, result.getTotalPages(), result.getTotalElements());
    }

    public List<String> getHiddenPosts(String userId) {
        User user = userRepo.findById(userId).orElseThrow();
        return user.getHiddenPostIds() != null ? user.getHiddenPostIds() : new ArrayList<>();
    }

    public void hidePost(String postId, String userId) {
        User user = userRepo.findById(userId).orElseThrow();
        List<String> hidden = user.getHiddenPostIds();
        if (hidden == null) hidden = new ArrayList<>();

        if (!hidden.contains(postId)) {
            hidden.add(postId);
        }
        user.setHiddenPostIds(hidden);
        userRepo.save(user);
    }

    public void unhidePost(String postId, String userId) {
        User user = userRepo.findById(userId).orElseThrow();
        List<String> hidden = user.getHiddenPostIds();
        if (hidden == null) hidden = new ArrayList<>();

        hidden.remove(postId);
        user.setHiddenPostIds(hidden);
        userRepo.save(user);
    }

    private void updateUserTagScore(String userId, List<String> tags, int weight) {
        if (userId == null || tags == null || tags.isEmpty()) return;
        userRepo.findById(userId).ifPresent(user -> {
            Map<String, Integer> tagCount = user.getTagViewCount();
            if (tagCount == null) tagCount = new HashMap<>();
            for (String tag : tags) {
                String t = tag.toLowerCase().trim();
                tagCount.merge(t, weight, Integer::sum);
            }
            user.setTagViewCount(tagCount);
            userRepo.save(user);
        });
    }

    public Post addComment(String postId, String authorId, String authorName, String content) {
        Post post = postRepo.findById(postId).orElseThrow();
        User author = userRepo.findById(authorId).orElse(null);

        Post.Comment comment = Post.Comment.builder()
                .id(UUID.randomUUID().toString())
                .authorId(authorId)
                .authorName(authorName)
                .authorAvatar(author != null ? author.getAvatar() : null)
                .content(content)
                .createdAt(Instant.now())
                .build();

        post.getComments().add(comment);
        updateUserTagScore(authorId, post.getTags(), 2);
        
        // Notify post author if not commenting on their own post
        if (!post.getAuthorId().equals(authorId)) {
            notificationService.send(
                post.getAuthorId(),
                "Có bình luận mới về bài viết của bạn",
                authorName + " đã bình luận về bài viết \"" + post.getTitle() + "\"",
                "POST_COMMENT",
                "/blog"
            );
        }

        return postRepo.save(post);
    }

    public Post replyComment(String postId, String parentCommentId, String authorId, String authorName, String content) {
        Post post = postRepo.findById(postId).orElseThrow();
        User author = userRepo.findById(authorId).orElse(null);

        Post.Comment comment = Post.Comment.builder()
                .id(UUID.randomUUID().toString())
                .authorId(authorId)
                .authorName(authorName)
                .authorAvatar(author != null ? author.getAvatar() : null)
                .content(content)
                .parentId(parentCommentId)
                .createdAt(Instant.now())
                .build();

        post.getComments().add(comment);
        updateUserTagScore(authorId, post.getTags(), 2);
        
        // Notify the author of the parent comment
        post.getComments().stream()
                .filter(c -> c.getId().equals(parentCommentId))
                .findFirst()
                .ifPresent(parentComment -> {
                    if (!parentComment.getAuthorId().equals(authorId)) {
                        notificationService.send(
                                parentComment.getAuthorId(),
                                "Có phản hồi mới về bình luận của bạn",
                                authorName + " đã trả lời bình luận của bạn: \"" + content + "\"",
                                "COMMENT_REPLY",
                                "/blog"
                        );
                    }
                });

        return postRepo.save(post);
    }

    public Post deleteComment(String postId, String commentId, String userId) {
        Post post = postRepo.findById(postId).orElseThrow();
        User user = userRepo.findById(userId).orElseThrow();
        
        Post.Comment commentToDelete = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bình luận"));

        boolean isCommentAuthor = commentToDelete.getAuthorId().equals(userId);
        boolean isPostAuthor = post.getAuthorId().equals(userId);
        boolean isAdmin = user.getRole() == User.Role.ADMIN;

        if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xóa bình luận này");
        }

        commentToDelete.setDeleted(true);
        commentToDelete.setDeletedBy(userId);
        commentToDelete.setDeletedAt(Instant.now());
        commentToDelete.setContent("Bình luận này đã bị xóa.");

        return postRepo.save(post);
    }

    public Post editComment(String postId, String commentId, String userId, String content) {
        Post post = postRepo.findById(postId).orElseThrow();
        Post.Comment commentToEdit = post.getComments().stream()
                .filter(c -> c.getId().equals(commentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bình luận"));

        if (!commentToEdit.getAuthorId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa bình luận này");
        }

        commentToEdit.setContent(content);
        commentToEdit.setUpdatedAt(Instant.now());
        return postRepo.save(post);
    }

    public PostShare sharePost(String postId, String senderId, String targetType, String targetUserId, String targetGroupId, String message) {
        User sender = userRepo.findById(senderId).orElseThrow();
        Post post = postRepo.findById(postId).orElseThrow();

        PostShare share = PostShare.builder()
                .postId(postId)
                .senderId(senderId)
                .senderName(sender.getFullName())
                .targetType(targetType)
                .targetUserId(targetUserId)
                .targetGroupId(targetGroupId)
                .message(message)
                .createdAt(Instant.now())
                .build();

        postShareRepo.save(share);

        // Send notifications based on targetType
        if ("FRIEND".equalsIgnoreCase(targetType) && targetUserId != null) {
            notificationService.send(
                    targetUserId,
                    "Bài viết được chia sẻ với bạn",
                    sender.getFullName() + " đã chia sẻ bài viết \"" + post.getTitle() + "\" với bạn: " + (message != null ? message : ""),
                    "POST_SHARED",
                    "/blog"
            );
        } else if ("GROUP".equalsIgnoreCase(targetType) && targetGroupId != null) {
            groupRepo.findById(targetGroupId).ifPresent(g -> {
                if (g.getMembers() != null) {
                    g.getMembers().forEach(m -> {
                        if (!m.getUserId().equals(senderId)) {
                            notificationService.send(
                                    m.getUserId(),
                                    "Bài viết mới được chia sẻ vào nhóm " + g.getName(),
                                    sender.getFullName() + " đã chia sẻ bài viết \"" + post.getTitle() + "\" vào nhóm: " + (message != null ? message : ""),
                                    "POST_SHARED",
                                    "/blog"
                            );
                        }
                    });
                }
            });
        }

        return share;
    }

    public List<PostShare> getShares(String postId) {
        return postShareRepo.findByPostId(postId);
    }

    public void delete(String id, String userId) {
        Post post = postRepo.findById(id).orElseThrow();
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền xoá bài viết này");
        }
        postRepo.delete(post);
    }

    private PageResponse<Post> buildPage(List<Post> content, int page, int size, int totalPages, long totalElements) {
        return PageResponse.<Post>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalPages(totalPages)
                .totalElements(totalElements)
                .build();
    }
}
