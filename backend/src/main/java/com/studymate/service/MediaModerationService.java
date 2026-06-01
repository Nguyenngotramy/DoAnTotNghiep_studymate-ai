package com.studymate.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Slf4j
public class MediaModerationService {

    private static final int MAX_IMAGES_PER_REQUEST = 4;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(25))
            .build();

    @Value("${app.openai.api-key:}")
    private String apiKey;

    @Value("${app.openai.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    @Value("${app.openai.model:openai/gpt-4.1-mini}")
    private String model;

    @Value("${app.openai.vision-model:openai/gpt-4o-mini}")
    private String visionModel;

    @Value("${app.public-base-url:http://localhost:8080/api}")
    private String publicBaseUrl;

    public static class MediaModerationResult {
        public String mediaSafetyStatus = "UNKNOWN";
        public String mediaSafetyReason = "";
        public List<String> flaggedImageUrls = new ArrayList<>();
        public String educationalRelevance = "LOW";
    }

    public boolean hasMedia(List<String> imageUrls, String videoUrl) {
        boolean hasImages = imageUrls != null && imageUrls.stream().anyMatch(u -> u != null && !u.isBlank());
        boolean hasVideo = videoUrl != null && !videoUrl.isBlank();
        return hasImages || hasVideo;
    }

    /**
     * Moderate all attached media. Returns UNKNOWN when vision is unavailable (no auto-approve).
     */
    public MediaModerationResult moderatePostMedia(
            List<String> imageUrls,
            String videoUrl,
            String title,
            String content
    ) {
        if (!hasMedia(imageUrls, videoUrl)) {
            MediaModerationResult ok = new MediaModerationResult();
            ok.mediaSafetyStatus = "SAFE";
            ok.mediaSafetyReason = "";
            ok.educationalRelevance = "HIGH";
            return ok;
        }

        if (!isVisionConfigured()) {
            MediaModerationResult unknown = new MediaModerationResult();
            unknown.mediaSafetyStatus = "UNKNOWN";
            unknown.mediaSafetyReason = "Hệ thống chưa kiểm duyệt được media (AI vision chưa cấu hình).";
            unknown.educationalRelevance = "LOW";
            if (imageUrls != null) {
                unknown.flaggedImageUrls.addAll(imageUrls.stream().filter(u -> u != null && !u.isBlank()).toList());
            }
            return unknown;
        }

        MediaModerationResult aggregate = new MediaModerationResult();
        aggregate.mediaSafetyStatus = "SAFE";
        aggregate.mediaSafetyReason = "";
        aggregate.educationalRelevance = "HIGH";

        List<String> urls = imageUrls != null
                ? imageUrls.stream().filter(u -> u != null && !u.isBlank()).limit(MAX_IMAGES_PER_REQUEST).toList()
                : List.of();

        for (String imageUrl : urls) {
            try {
                String resolved = resolvePublicUrl(imageUrl);
                if (!isImageReachable(resolved)) {
                    log.warn("Image not reachable for moderation: {}", resolved);
                    aggregate = mergeResults(aggregate, unknownForUrl(imageUrl,
                            "Không truy cập được ảnh để kiểm duyệt tự động, cần admin xem xét."));
                    continue;
                }
                MediaModerationResult one = moderateSingleImage(imageUrl, title, content);
                aggregate = mergeResults(aggregate, one);
            } catch (Exception e) {
                log.warn("Media moderation failed for image {}: {}", imageUrl, e.getMessage());
                aggregate = mergeResults(aggregate, unknownForUrl(imageUrl,
                        "Không thể kiểm duyệt ảnh tự động, cần admin xem xét."));
            }
        }

        if (videoUrl != null && !videoUrl.isBlank()) {
            try {
                MediaModerationResult videoResult = moderateVideoReference(videoUrl, title, content);
                aggregate = mergeResults(aggregate, videoResult);
            } catch (Exception e) {
                log.warn("Video reference moderation failed: {}", e.getMessage());
                aggregate = mergeResults(aggregate, unknownForUrl(videoUrl,
                        "Video cần được kiểm duyệt thủ công trước khi hiển thị."));
            }
        }

        normalizeMediaResult(aggregate);
        applyEducationalRelevanceRules(aggregate);
        return aggregate;
    }

    /** SAFE + LOW relevance → WARNING; lingerie/NSFW must not stay SAFE. */
    private void applyEducationalRelevanceRules(MediaModerationResult result) {
        if (result == null) return;
        String relevance = nullToEmpty(result.educationalRelevance).toUpperCase(Locale.ROOT);
        String status = nullToEmpty(result.mediaSafetyStatus).toUpperCase(Locale.ROOT);
        String reasonLower = nullToEmpty(result.mediaSafetyReason).toLowerCase(Locale.ROOT);

        if ("SAFE".equals(status) && "LOW".equals(relevance)) {
            result.mediaSafetyStatus = "WARNING";
            if (result.mediaSafetyReason.isBlank()) {
                result.mediaSafetyReason = "Media có độ liên quan học tập thấp, cần admin xem xét.";
            }
        }

        if ("SAFE".equals(status)) {
            if (reasonLower.contains("nhạy cảm") || reasonLower.contains("không phù hợp")
                    || reasonLower.contains("khong phu hop") || reasonLower.contains("gợi cảm")
                    || reasonLower.contains("goi cam") || reasonLower.contains("lingerie")
                    || reasonLower.contains("nude") || reasonLower.contains("nsfw")) {
                result.mediaSafetyStatus = "VIOLATION";
            }
        }
    }

    private boolean isImageReachable(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            HttpRequest head = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(8))
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<Void> response = httpClient.send(head, HttpResponse.BodyHandlers.discarding());
            int code = response.statusCode();
            if (code >= 200 && code < 400) return true;
            // Some CDNs reject HEAD — try lightweight GET range
            HttpRequest get = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Range", "bytes=0-0")
                    .GET()
                    .build();
            HttpResponse<Void> getResp = httpClient.send(get, HttpResponse.BodyHandlers.discarding());
            return getResp.statusCode() >= 200 && getResp.statusCode() < 400;
        } catch (Exception e) {
            log.debug("Image reachability check failed for {}: {}", url, e.getMessage());
            return false;
        }
    }

    private String nullToEmpty(String v) {
        return v == null ? "" : v;
    }

    private MediaModerationResult moderateSingleImage(String imageUrl, String title, String content) throws Exception {
        String resolvedUrl = resolvePublicUrl(imageUrl);
        String prompt = buildMediaPrompt(title, content, false);

        List<Map<String, Object>> contentParts = new ArrayList<>();
        contentParts.add(Map.of("type", "text", "text", prompt));
        contentParts.add(Map.of(
                "type", "image_url",
                "image_url", Map.of("url", resolvedUrl)
        ));

        String json = callVisionChat(contentParts);
        MediaModerationResult result = parseMediaJson(json);
        applyEducationalRelevanceRules(result);
        if (!"SAFE".equalsIgnoreCase(result.mediaSafetyStatus)) {
            if (!result.flaggedImageUrls.contains(imageUrl)) {
                result.flaggedImageUrls.add(imageUrl);
            }
        }
        return result;
    }

    private MediaModerationResult moderateVideoReference(String videoUrl, String title, String content) throws Exception {
        String prompt = buildMediaPrompt(title, content, true)
                + "\n\nVideo URL đính kèm: " + videoUrl
                + "\nBạn không xem được video trực tiếp. Nếu không chắc chắn phù hợp môi trường học tập, trả WARNING và educationalRelevance LOW.";

        List<Map<String, Object>> contentParts = List.of(Map.of("type", "text", "text", prompt));
        String json = callVisionChat(contentParts);
        MediaModerationResult result = parseMediaJson(json);
        if (!"SAFE".equals(result.mediaSafetyStatus)) {
            result.flaggedImageUrls.add(videoUrl);
        }
        return result;
    }

    private String buildMediaPrompt(String title, String content, boolean videoOnly) {
        return """
                Bạn là hệ thống kiểm duyệt media cho nền tảng học tập StudyMate AI.
                Hãy kiểm tra ảnh/video preview có phù hợp với môi trường học tập không.
                Không mô tả chi tiết nội dung nhạy cảm.
                Chỉ trả JSON thuần, không markdown:
                {
                  "mediaSafetyStatus": "SAFE hoặc WARNING hoặc VIOLATION",
                  "mediaSafetyReason": "lý do ngắn gọn, an toàn",
                  "educationalRelevance": "HIGH hoặc MEDIUM hoặc LOW",
                  "flaggedImageUrls": []
                }

                Quy tắc (bắt buộc):
                - Ảnh nội y, gợi cảm, bikini/đồ lót, bạo lực, ma túy, vũ khí: VIOLATION.
                - Ảnh không liên quan học tập và có yếu tố nhạy cảm: VIOLATION.
                - Ảnh không chắc chắn nhưng có thể không phù hợp môi trường học tập: WARNING.
                - Chỉ SAFE khi ảnh rõ ràng là tài liệu học tập, slide bài giảng, sơ đồ, lớp học, code, screenshot học tập, logo app học tập.
                - Nếu ảnh không liên quan môn học/tag bài viết: educationalRelevance = LOW.
                - Không mô tả chi tiết cơ thể hoặc nội dung nhạy cảm.

                Tiêu đề bài viết: %s
                Nội dung bài viết (ngữ cảnh): %s
                Loại media: %s
                """.formatted(
                safe(title),
                truncate(content, 1500),
                videoOnly ? "video URL (chưa phân tích khung hình)" : "hình ảnh đính kèm"
        );
    }

    private String callVisionChat(List<Map<String, Object>> contentParts) throws IOException, InterruptedException {
        Map<String, Object> body = Map.of(
                "model", visionModel,
                "temperature", 0.1,
                "max_tokens", 400,
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", contentParts
                        )
                )
        );

        String requestJson = objectMapper.writeValueAsString(body);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(resolveBaseUrl() + "/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8));

        if (resolveBaseUrl().contains("openrouter.ai")) {
            builder.header("HTTP-Referer", "http://localhost:5175");
            builder.header("X-Title", "StudyMate AI");
        }

        HttpResponse<String> response = httpClient.send(
                builder.build(),
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Vision API HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode node = objectMapper.readTree(response.body());
        JsonNode choices = node.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            String text = choices.get(0).path("message").path("content").asText("");
            if (!text.isBlank()) return cleanJsonText(text);
        }
        throw new RuntimeException("Vision API returned empty content");
    }

    private MediaModerationResult parseMediaJson(String json) throws IOException {
        JsonNode root = objectMapper.readTree(json);
        MediaModerationResult result = new MediaModerationResult();
        result.mediaSafetyStatus = root.path("mediaSafetyStatus").asText("UNKNOWN").toUpperCase(Locale.ROOT);
        result.mediaSafetyReason = root.path("mediaSafetyReason").asText("");
        result.educationalRelevance = root.path("educationalRelevance").asText("LOW").toUpperCase(Locale.ROOT);
        result.flaggedImageUrls = new ArrayList<>();
        if (root.has("flaggedImageUrls") && root.get("flaggedImageUrls").isArray()) {
            for (JsonNode n : root.get("flaggedImageUrls")) {
                String u = n.asText("").trim();
                if (!u.isBlank()) result.flaggedImageUrls.add(u);
            }
        }
        normalizeMediaResult(result);
        return result;
    }

    private MediaModerationResult mergeResults(MediaModerationResult current, MediaModerationResult next) {
        if (severity(next.mediaSafetyStatus) > severity(current.mediaSafetyStatus)) {
            current.mediaSafetyStatus = next.mediaSafetyStatus;
            current.mediaSafetyReason = next.mediaSafetyReason;
            current.educationalRelevance = next.educationalRelevance;
        } else if (severity(next.mediaSafetyStatus) == severity(current.mediaSafetyStatus)
                && next.mediaSafetyReason != null && !next.mediaSafetyReason.isBlank()
                && (current.mediaSafetyReason == null || current.mediaSafetyReason.isBlank())) {
            current.mediaSafetyReason = next.mediaSafetyReason;
        }
        if (next.flaggedImageUrls != null) {
            for (String u : next.flaggedImageUrls) {
                if (!current.flaggedImageUrls.contains(u)) {
                    current.flaggedImageUrls.add(u);
                }
            }
        }
        return current;
    }

    private int severity(String status) {
        if (status == null) return 0;
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "VIOLATION" -> 3;
            case "WARNING" -> 2;
            case "UNKNOWN" -> 1;
            default -> 0;
        };
    }

    private MediaModerationResult unknownForUrl(String url, String reason) {
        MediaModerationResult r = new MediaModerationResult();
        r.mediaSafetyStatus = "UNKNOWN";
        r.mediaSafetyReason = reason;
        r.educationalRelevance = "LOW";
        r.flaggedImageUrls.add(url);
        return r;
    }

    private void normalizeMediaResult(MediaModerationResult result) {
        if (result.mediaSafetyStatus == null || result.mediaSafetyStatus.isBlank()) {
            result.mediaSafetyStatus = "UNKNOWN";
        }
        result.mediaSafetyStatus = result.mediaSafetyStatus.toUpperCase(Locale.ROOT);
        if (!List.of("SAFE", "WARNING", "VIOLATION", "UNKNOWN").contains(result.mediaSafetyStatus)) {
            result.mediaSafetyStatus = "WARNING";
        }
        if (result.mediaSafetyReason == null) {
            result.mediaSafetyReason = "";
        }
        if (result.flaggedImageUrls == null) {
            result.flaggedImageUrls = new ArrayList<>();
        }
    }

    public String resolvePublicUrl(String url) {
        if (url == null || url.isBlank()) return url;
        String trimmed = url.trim().replace('\\', '/');
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        String base = publicBaseUrl.replaceAll("/+$", "");
        if (trimmed.startsWith("/api/")) {
            return base.replaceAll("/api$", "") + trimmed;
        }
        if (trimmed.startsWith("/uploads/")) {
            return base + trimmed;
        }
        if (trimmed.startsWith("uploads/")) {
            return base + "/" + trimmed;
        }
        return base + "/uploads/" + trimmed;
    }

    private boolean isVisionConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    private String resolveBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "https://openrouter.ai/api/v1";
        }
        return baseUrl.replaceAll("/+$", "");
    }

    private String safe(String v) {
        return v != null ? v : "";
    }

    private String truncate(String v, int max) {
        if (v == null) return "";
        String t = v.trim();
        return t.length() <= max ? t : t.substring(0, max) + "...";
    }

    private String cleanJsonText(String raw) {
        if (raw == null) return "{}";
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7).trim();
        else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3).trim();
        if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3).trim();
        int first = cleaned.indexOf('{');
        int last = cleaned.lastIndexOf('}');
        if (first >= 0 && last > first) cleaned = cleaned.substring(first, last + 1);
        return cleaned;
    }
}
