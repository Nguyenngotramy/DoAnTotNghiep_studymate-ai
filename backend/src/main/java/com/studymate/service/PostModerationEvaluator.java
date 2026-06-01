package com.studymate.service;

import com.studymate.model.Post;
import com.studymate.repository.PostReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

/**
 * Central moderation rules for auto-approve, admin tabs, feed visibility, and legacy tolerance.
 */
@Component
@RequiredArgsConstructor
public class PostModerationEvaluator {

    public static final double MIN_AUTO_APPROVE_CONFIDENCE = 0.75;

    private final PostReportRepository postReportRepo;

    public long countOpenReports(String postId) {
        if (postId == null || postId.isBlank()) return 0;
        return postReportRepo.countByPostIdAndStatus(postId, "OPEN");
    }

    public boolean hasOpenReports(String postId) {
        return countOpenReports(postId) > 0;
    }

    public boolean hasMedia(Post post) {
        if (post == null) return false;
        boolean hasImages = post.getImageUrls() != null
                && post.getImageUrls().stream().anyMatch(u -> u != null && !u.isBlank());
        boolean hasVideo = post.getVideoUrl() != null && !post.getVideoUrl().isBlank();
        return hasImages || hasVideo;
    }

    public boolean subjectsMatch(String a, String b) {
        String na = normalizeVietnamese(a);
        String nb = normalizeVietnamese(b);
        if (na.isBlank() || nb.isBlank()) return false;
        return na.equals(nb) || na.contains(nb) || nb.contains(na);
    }

    public boolean computeTagMatch(String subject, List<String> tags, String detectedSubject, double confidence) {
        if (detectedSubject == null || detectedSubject.isBlank()) {
            return true;
        }
        if (detectedSubject.equalsIgnoreCase("Khác")) {
            boolean userPickedOther = subject == null || subject.isBlank() || subject.equalsIgnoreCase("Khác");
            boolean tagsOnlyOther = tags == null || tags.isEmpty()
                    || tags.stream().allMatch(t -> t == null || t.isBlank() || t.equalsIgnoreCase("Khác"));
            return userPickedOther && tagsOnlyOther;
        }
        if (subject != null && !subject.isBlank() && !subject.equalsIgnoreCase("Khác")) {
            if (subjectsMatch(subject, detectedSubject)) return true;
        }
        if (tags != null) {
            for (String tag : tags) {
                if (tag != null && !tag.equalsIgnoreCase("Khác") && subjectsMatch(tag, detectedSubject)) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean computeTagMatch(Post post) {
        if (post == null) return true;
        return computeTagMatch(post.getSubject(), post.getTags(), post.getAiDetectedSubject(), post.getAiTagConfidence());
    }

    public double normalizeConfidence(double raw) {
        if (Double.isNaN(raw) || raw < 0) return 0;
        if (raw > 1 && raw <= 100) return raw / 100.0;
        if (raw > 100) return 1.0;
        return raw;
    }

    public double normalizedConfidence(Post post) {
        return post == null ? 0 : normalizeConfidence(post.getAiTagConfidence());
    }

    public boolean isSafeAi(Post post) {
        if (post == null) return false;
        String status = nullToEmpty(post.getAiSafetyStatus());
        if (status.isBlank()) {
            return meetsConfidence(post) && computeTagMatch(post);
        }
        return "SAFE".equalsIgnoreCase(status);
    }

    public boolean meetsConfidence(Post post) {
        return post != null && normalizedConfidence(post) >= MIN_AUTO_APPROVE_CONFIDENCE;
    }

    public boolean isMediaModerated(Post post) {
        if (!hasMedia(post)) return true;
        String status = nullToEmpty(post.getMediaSafetyStatus());
        return !status.isBlank();
    }

    /** Media must be SAFE for public auto-approve; posts without media pass. */
    public boolean isMediaSafeForPublic(Post post) {
        if (!hasMedia(post)) return true;
        if (!isMediaModerated(post)) return false;
        return "SAFE".equalsIgnoreCase(nullToEmpty(post.getMediaSafetyStatus()));
    }

    public boolean hasSafeAiSignals(Post post) {
        if (post == null) return false;
        if (hasOpenReports(post.getId())) return false;
        if (!isSafeAi(post)) return false;
        if (!meetsConfidence(post)) return false;
        if (!computeTagMatch(post)) return false;
        if (!isMediaSafeForPublic(post)) return false;
        if ("WARNING".equalsIgnoreCase(nullToEmpty(post.getAiSafetyStatus()))) return false;
        if ("VIOLATION".equalsIgnoreCase(nullToEmpty(post.getAiSafetyStatus()))) return false;
        return true;
    }

    public boolean shouldExcludeFromAdminQueues(Post post) {
        if (needsMediaAdminReview(post)) return false;
        return hasSafeAiSignals(post);
    }

    /** Posts with media issues must always appear in admin queues. */
    public boolean needsMediaAdminReview(Post post) {
        if (!hasMedia(post)) return false;
        String mediaStatus = nullToEmpty(post.getMediaSafetyStatus()).toUpperCase(Locale.ROOT);
        if (List.of("WARNING", "VIOLATION", "UNKNOWN").contains(mediaStatus)) return true;
        if (!isMediaModerated(post)) return true;
        if (post.getFlaggedImageUrls() != null && !post.getFlaggedImageUrls().isEmpty()) return true;
        if ("PENDING_REVIEW".equalsIgnoreCase(nullToEmpty(post.getModerationStatus()))) return true;
        return nullToEmpty(post.getModerationReason()).toLowerCase(Locale.ROOT).contains("media");
    }

    public boolean isAutoApprovable(Post post) {
        if (!hasSafeAiSignals(post)) return false;
        if (post.isAuthorRevisionRequired()) return false;
        return true;
    }

    public boolean isPublicFeedEligible(Post post) {
        if (post == null || !post.isPublished()) return false;

        String status = nullToEmpty(post.getModerationStatus()).toUpperCase(Locale.ROOT);
        if (List.of("REJECTED", "REMOVED", "NEEDS_REVISION", "PENDING_REVIEW").contains(status)) {
            return false;
        }

        if (hasBlockingMedia(post)) return false;
        if ("VIOLATION".equalsIgnoreCase(nullToEmpty(post.getAiSafetyStatus()))) return false;

        // Tin quyết định APPROVED — không kiểm lại confidence/tag (tránh chặn bài admin đã duyệt)
        if ("APPROVED".equalsIgnoreCase(status)) {
            return true;
        }

        // Bài cũ: published=true trước khi có moderationStatus
        if (status.isBlank()) {
            return true;
        }

        return hasSafeAiSignals(post);
    }

    /** Media không an toàn — chặn khỏi feed công khai. */
    public boolean hasBlockingMedia(Post post) {
        if (!hasMedia(post)) return false;
        String mediaStatus = nullToEmpty(post.getMediaSafetyStatus());
        if ("UNKNOWN".equalsIgnoreCase(mediaStatus)
                || "WARNING".equalsIgnoreCase(mediaStatus)
                || "VIOLATION".equalsIgnoreCase(mediaStatus)) {
            return true;
        }
        return post.getFlaggedImageUrls() != null && !post.getFlaggedImageUrls().isEmpty();
    }

    public void applyAutoApprovedState(Post post) {
        post.setModerationStatus("APPROVED");
        post.setPublished(true);
        post.setModerationReason("");
        post.setAuthorRevisionRequired(false);
        post.setRevisionMessage("");
    }

    public void applyNeedsRevisionState(Post post, String reason, String revisionMessage) {
        post.setModerationStatus("NEEDS_REVISION");
        post.setPublished(false);
        post.setAuthorRevisionRequired(true);
        post.setModerationReason(reason != null ? reason : "");
        post.setRevisionMessage(revisionMessage != null ? revisionMessage : "");
    }

    public void applyPendingReviewState(Post post, String reason) {
        post.setModerationStatus("PENDING_REVIEW");
        post.setPublished(false);
        post.setModerationReason(reason != null ? reason : "");
    }

    public void applyRejectedState(Post post, String reason) {
        post.setModerationStatus("REJECTED");
        post.setPublished(false);
        post.setModerationReason(reason != null ? reason : "");
        post.setAuthorRevisionRequired(false);
    }

    public boolean healIfMisclassified(Post post) {
        if (post == null || !hasSafeAiSignals(post)) return false;
        if (hasOpenReports(post.getId())) return false;
        if (post.getFlaggedImageUrls() != null && !post.getFlaggedImageUrls().isEmpty()) return false;
        if (needsMediaAdminReview(post)) return false;

        String status = nullToEmpty(post.getModerationStatus());
        boolean needsHeal = !"APPROVED".equalsIgnoreCase(status)
                || !post.isPublished()
                || post.isAuthorRevisionRequired()
                || (post.getModerationReason() != null && !post.getModerationReason().isBlank());

        if (needsHeal) {
            applyAutoApprovedState(post);
            return true;
        }
        return false;
    }

    public boolean matchesPendingTab(Post post) {
        if (post == null) return false;
        if (isAdminClosed(post)) return false;
        if (shouldExcludeFromAdminQueues(post)) return false;
        // Chỉ AI chưa sẵn sàng / media chưa quét được — không phải vi phạm
        return "PENDING_REVIEW".equalsIgnoreCase(nullToEmpty(post.getModerationStatus())) && !post.isPublished();
    }

    /**
     * AI cảnh báo: vi phạm media, tag sai, text cảnh báo — chờ admin gỡ/duyệt.
     * Bài REJECTED tự động (chưa reviewedAt) vẫn hiện ở đây.
     */
    public boolean matchesFlaggedTab(Post post) {
        if (post == null) return false;
        if (isAdminClosed(post)) return false;
        if (shouldExcludeFromAdminQueues(post)) return false;

        String status = nullToEmpty(post.getModerationStatus());

        // AI tự chặn media vi phạm — admin cần xác nhận gỡ
        if ("REJECTED".equalsIgnoreCase(status)) return true;

        String mediaStatus = nullToEmpty(post.getMediaSafetyStatus());
        if (hasMedia(post)) {
            if ("WARNING".equalsIgnoreCase(mediaStatus)
                    || "VIOLATION".equalsIgnoreCase(mediaStatus)
                    || "UNKNOWN".equalsIgnoreCase(mediaStatus)
                    || !isMediaModerated(post)) {
                return true;
            }
            String reason = nullToEmpty(post.getModerationReason()).toLowerCase(Locale.ROOT);
            if (reason.contains("media")) {
                return true;
            }
        }

        if ("PENDING_REVIEW".equalsIgnoreCase(status)) {
            // Text vi phạm nặng — vẫn cần admin xem
            if ("VIOLATION".equalsIgnoreCase(nullToEmpty(post.getAiSafetyStatus()))) return true;
            return false;
        }

        if ("NEEDS_REVISION".equalsIgnoreCase(status)) return true;
        if (post.isAuthorRevisionRequired()) return true;
        if ("WARNING".equalsIgnoreCase(nullToEmpty(post.getAiSafetyStatus()))) return true;
        if ("VIOLATION".equalsIgnoreCase(nullToEmpty(post.getAiSafetyStatus()))) return true;

        double conf = normalizedConfidence(post);
        if (conf > 0 && conf < MIN_AUTO_APPROVE_CONFIDENCE) return true;

        if (!computeTagMatch(post)
                && post.getAiDetectedSubject() != null
                && !post.getAiDetectedSubject().isBlank()
                && !"Khác".equalsIgnoreCase(post.getAiDetectedSubject())) {
            return true;
        }

        String reason = nullToEmpty(post.getModerationReason()).toLowerCase(Locale.ROOT);
        return reason.contains("media")
                || reason.contains("ai phát hiện")
                || reason.contains("ai phat hien")
                || reason.contains("không khớp");
    }

    /** Đã xử lý: chỉ bài admin đã gỡ/từ chối — không liệt kê bài đã duyệt thành công. */
    public boolean matchesProcessedTab(Post post) {
        if (post == null || post.getReviewedAt() == null) return false;
        String status = nullToEmpty(post.getModerationStatus()).toUpperCase(Locale.ROOT);
        return List.of("REJECTED", "REMOVED").contains(status);
    }

    public String normalizeVietnamese(String value) {
        if (value == null) return "";
        String nfd = Normalizer.normalize(value.trim(), Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase(Locale.ROOT);
    }

    /** Nội dung spam/ký tự lặp — không đủ cơ sở gán môn học cao. */
    public boolean isLowQualityText(String title, String content) {
        String body = nullToEmpty(content).trim();
        String t = nullToEmpty(title).trim();
        if (body.length() < 25 && t.length() < 8) return true;
        if (body.length() >= 3 && isMostlyRepeatedChars(body)) return true;
        if (countMeaningfulWords(body) < 3 && body.length() < 80) return true;
        return false;
    }

    /** Hạ confidence và chủ đề khi text không đủ chất lượng — tránh hiển thị 95% Lập trình oan. */
    public void applyTextQualityAdjustments(Post post) {
        if (post == null || !isLowQualityText(post.getTitle(), post.getContent())) return;
        post.setAiDetectedSubject("Khác");
        post.setAiTagConfidence(Math.min(normalizedConfidence(post), 0.2));
        if ("SAFE".equalsIgnoreCase(nullToEmpty(post.getAiSafetyStatus()))) {
            post.setAiSafetyStatus("WARNING");
            post.setAiSafetyReason("Nội dung quá ngắn hoặc không đủ thông tin học tập để xác minh chủ đề/môn học.");
        }
    }

    /** Đã xử lý xong — rời hàng đợi AI cảnh báo / chờ duyệt. */
    private boolean isAdminClosed(Post post) {
        if ("REMOVED".equalsIgnoreCase(nullToEmpty(post.getModerationStatus()))) return true;
        return post.getReviewedAt() != null;
    }

    private boolean isMostlyRepeatedChars(String text) {
        if (text == null || text.length() < 6) return false;
        String compact = text.replaceAll("\\s+", "");
        if (compact.length() < 6) return false;
        long distinct = compact.chars().distinct().count();
        return distinct <= 2;
    }

    private int countMeaningfulWords(String text) {
        if (text == null || text.isBlank()) return 0;
        String[] parts = text.trim().split("\\s+");
        int count = 0;
        for (String p : parts) {
            if (p.length() >= 2) count++;
        }
        return count;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
