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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OpenAiModerationService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    // Không hardcode API key trong code.
    // Set bằng PowerShell:
    // $env:OPENAI_API_KEY="sk-or-v1-..."
    @Value("${app.openai.api-key:}")
    private String apiKey;

    // OpenRouter:
    // https://openrouter.ai/api/v1
    //
    // OpenAI chính chủ:
    // https://api.openai.com/v1
    @Value("${app.openai.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    // OpenRouter nên dùng:
    // openai/gpt-4.1-mini
    //
    // OpenAI chính chủ có thể dùng:
    // gpt-4.1-mini
    @Value("${app.openai.model:openai/gpt-4.1-mini}")
    private String model;

    private static final int MAX_OUTPUT_TOKENS = 800;
    private static final int MAX_INPUT_CHARS = 6000;

    public static final String SHORT_CONTENT_SUMMARY =
            "Nội dung bài viết chưa đủ để tóm tắt rõ ràng.";

    public static class ModerationResult {
        public String summary = "";
        public String detectedSubject = "Khác";
        public List<String> suggestedTags = new ArrayList<>();
        public double tagConfidence = 0.0;

        // Giữ SAFE/WARNING/VIOLATION để tránh vỡ logic cũ.
        // Khi AI lỗi, dùng WARNING + safetyReason.
        public String safetyStatus = "SAFE";
        public String safetyReason = "";
    }

    public boolean isContentTooShortForSummary(String content) {
        if (content == null) return true;

        String trimmed = content.trim();
        if (trimmed.length() < 80) return true;

        String[] words = trimmed.split("\\s+");
        return words.length < 15;
    }

    public ModerationResult moderatePreCheck(
            String title,
            String content,
            String selectedSubject,
            List<String> selectedTags
    ) {
        ModerationResult result = buildDefaultResult(selectedSubject, selectedTags);

        if (!isOpenAiConfigured()) {
            return fallbackResult(
                    "AI chưa được cấu hình OPENAI_API_KEY. Bạn vẫn có thể đăng bài để kiểm duyệt sau.",
                    selectedSubject,
                    selectedTags,
                    false
            );
        }

        String prompt = """
                Bạn là hệ thống AI kiểm duyệt trước bài viết học tập trên StudyMate AI.

                Nhiệm vụ:
                1. Xác định môn học/chủ đề thật sự của bài viết.
                2. Kiểm tra tag/môn học người dùng chọn có khớp nội dung không.
                3. Kiểm tra nội dung có an toàn cho môi trường học tập không.
                4. Chỉ trả về JSON thuần, không markdown, không giải thích ngoài JSON.

                Tiêu đề:
                %s

                Nội dung:
                %s

                Môn học người dùng chọn:
                %s

                Tags người dùng chọn:
                %s

                Trả về JSON theo đúng format:
                {
                  "detectedSubject": "Toán | Vật lý | Hóa học | Sinh học | Ngữ văn | Tiếng Anh | IELTS | TOEIC | Lập trình | AI/ML | Khác",
                  "suggestedTags": ["tag1", "tag2", "tag3"],
                  "tagConfidence": 0.85,
                  "safetyStatus": "SAFE | WARNING | VIOLATION",
                  "safetyReason": "Nếu SAFE thì để rỗng, nếu WARNING/VIOLATION thì ghi lý do ngắn gọn"
                }
                """.formatted(
                safeText(title),
                limitText(content),
                safeText(selectedSubject),
                selectedTags != null ? selectedTags.toString() : "[]"
        );

        try {
            String output = callOpenAi(prompt);
            applyPreCheckResponse(result, output);
            normalizeResult(result, selectedSubject, selectedTags);
            return result;
        } catch (Exception e) {
            log.warn("AI pre-check unavailable, using fallback result. Reason: {}", e.getMessage());
            return fallbackResult(
                    "AI hiện chưa khả dụng do API key/credit/token limit. Bạn vẫn có thể đăng bài để kiểm duyệt sau.",
                    selectedSubject,
                    selectedTags,
                    false
            );
        }
    }

    public ModerationResult moderateAndSummarize(
            String title,
            String content,
            String selectedSubject,
            List<String> selectedTags
    ) {
        boolean tooShort = isContentTooShortForSummary(content);
        ModerationResult result = buildDefaultResult(selectedSubject, selectedTags);

        if (tooShort) {
            result.summary = SHORT_CONTENT_SUMMARY;
        }

        if (!isOpenAiConfigured()) {
            ModerationResult fallback = fallbackResult(
                    "AI chưa được cấu hình OPENAI_API_KEY. Bài viết sẽ được kiểm duyệt sau.",
                    selectedSubject,
                    selectedTags,
                    true
            );
            fallback.summary = tooShort ? SHORT_CONTENT_SUMMARY : "";
            return fallback;
        }

        String prompt = """
                Bạn là hệ thống AI kiểm duyệt và tóm tắt bài viết học tập trên StudyMate AI.

                Yêu cầu rất quan trọng:
                - Chỉ trả về JSON thuần.
                - Không markdown.
                - Không text ngoài JSON.
                - Summary PHẢI dựa trên nội dung chính/body, không chỉ dựa vào tiêu đề hoặc tag.
                - Không bịa nội dung ảnh/video nếu nội dung văn bản không đề cập.
                - Không được tin tag/môn học người dùng chọn nếu nội dung không chứng minh được.
                - Nếu nội dung chỉ là ký tự lặp (vd: ccccc), spam, hoặc quá ngắn không có ý nghĩa học tập:
                  detectedSubject = "Khác", tagConfidence <= 0.2, safetyStatus = WARNING.
                - detectedSubject phải suy ra từ nội dung thật, không copy tag người dùng chọn.
                - Nếu nội dung quá ngắn, summary phải là: "%s"

                Tiêu đề:
                %s

                Nội dung chính/body:
                %s

                Môn học người dùng chọn:
                %s

                Tags người dùng chọn:
                %s

                JSON format:
                {
                  "summary": "Nếu đủ nội dung thì viết 2-4 gạch đầu dòng ngắn. Nếu nội dung quá ngắn thì trả đúng câu yêu cầu.",
                  "detectedSubject": "Toán | Vật lý | Hóa học | Sinh học | Ngữ văn | Tiếng Anh | IELTS | TOEIC | Lập trình | AI/ML | Khác",
                  "suggestedTags": ["tag1", "tag2", "tag3"],
                  "tagConfidence": 0.95,
                  "safetyStatus": "SAFE | WARNING | VIOLATION",
                  "safetyReason": "Nếu SAFE thì để rỗng, nếu WARNING/VIOLATION thì ghi lý do ngắn gọn"
                }
                """.formatted(
                SHORT_CONTENT_SUMMARY,
                safeText(title),
                limitText(content),
                safeText(selectedSubject),
                selectedTags != null ? selectedTags.toString() : "[]"
        );

        try {
            String output = callOpenAi(prompt);
            applyFullModerationResponse(result, output, tooShort);
            normalizeResult(result, selectedSubject, selectedTags);
            return result;
        } catch (Exception e) {
            log.warn("AI moderation unavailable, using fallback result. Reason: {}", e.getMessage());

            ModerationResult fallback = fallbackResult(
                    "AI hiện chưa khả dụng do API key/credit/token limit. Bài viết sẽ được kiểm duyệt sau.",
                    selectedSubject,
                    selectedTags,
                    true
            );

            fallback.summary = tooShort ? SHORT_CONTENT_SUMMARY : "";
            return fallback;
        }
    }

    private String callOpenAi(String prompt) throws IOException, InterruptedException {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("temperature", 0.2);
        body.put("max_tokens", MAX_OUTPUT_TOKENS);

        body.put("messages", List.of(
                Map.of(
                        "role", "system",
                        "content", "Bạn là trợ lý phân tích và kiểm duyệt nội dung học tập. Chỉ trả về JSON thuần, không markdown."
                ),
                Map.of(
                        "role", "user",
                        "content", prompt
                )
        ));

        String requestJson = objectMapper.writeValueAsString(body);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(resolveBaseUrl() + "/chat/completions"))
                .timeout(Duration.ofSeconds(40))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8));

        // OpenRouter khuyến nghị 2 header này. OpenAI chính chủ bỏ qua cũng không sao.
        if (resolveBaseUrl().contains("openrouter.ai")) {
            builder.header("HTTP-Referer", "http://localhost:5175");
            builder.header("X-Title", "StudyMate AI");
        }

        HttpRequest request = builder.build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        int status = response.statusCode();
        String responseBody = response.body();

        if (status < 200 || status >= 300) {
            throw new RuntimeException("AI provider returned HTTP " + status + ": " + responseBody);
        }

        JsonNode node = objectMapper.readTree(responseBody);
        String outputText = extractChatCompletionText(node);

        if (outputText == null || outputText.isBlank()) {
            throw new RuntimeException("AI provider returned empty output");
        }

        return cleanJsonText(outputText);
    }

    private void applyPreCheckResponse(ModerationResult result, String outputText) throws IOException {
        JsonNode jsonRes = objectMapper.readTree(outputText);

        result.detectedSubject = jsonRes.path("detectedSubject").asText(result.detectedSubject);
        result.suggestedTags = readStringList(jsonRes, "suggestedTags", result.suggestedTags);
        result.tagConfidence = jsonRes.path("tagConfidence").asDouble(result.tagConfidence);
        result.safetyStatus = jsonRes.path("safetyStatus").asText(result.safetyStatus).toUpperCase();
        result.safetyReason = jsonRes.path("safetyReason").asText(result.safetyReason);
    }

    private void applyFullModerationResponse(
            ModerationResult result,
            String outputText,
            boolean tooShort
    ) throws IOException {
        JsonNode jsonRes = objectMapper.readTree(outputText);

        if (!tooShort) {
            result.summary = jsonRes.path("summary").asText("");
        }

        result.detectedSubject = jsonRes.path("detectedSubject").asText(result.detectedSubject);
        result.suggestedTags = readStringList(jsonRes, "suggestedTags", result.suggestedTags);
        result.tagConfidence = jsonRes.path("tagConfidence").asDouble(result.tagConfidence);
        result.safetyStatus = jsonRes.path("safetyStatus").asText(result.safetyStatus).toUpperCase();
        result.safetyReason = jsonRes.path("safetyReason").asText(result.safetyReason);

        if (tooShort) {
            result.summary = SHORT_CONTENT_SUMMARY;
        }
    }

    private ModerationResult buildDefaultResult(String selectedSubject, List<String> selectedTags) {
        ModerationResult result = new ModerationResult();
        result.detectedSubject =
                selectedSubject != null && !selectedSubject.isBlank() ? selectedSubject : "Khác";
        result.suggestedTags =
                selectedTags != null ? new ArrayList<>(selectedTags) : new ArrayList<>();
        result.tagConfidence = 0.0;
        result.safetyStatus = "SAFE";
        result.safetyReason = "";
        return result;
    }

    private ModerationResult fallbackResult(
            String message,
            String selectedSubject,
            List<String> selectedTags,
            boolean includeSummary
    ) {
        ModerationResult result = buildDefaultResult(selectedSubject, selectedTags);
        result.summary = includeSummary ? "" : "";
        result.tagConfidence = 0.0;
        result.safetyStatus = "WARNING";
        result.safetyReason = message;
        return result;
    }

    private void normalizeResult(
            ModerationResult result,
            String selectedSubject,
            List<String> selectedTags
    ) {
        if (result.detectedSubject == null || result.detectedSubject.isBlank()) {
            result.detectedSubject =
                    selectedSubject != null && !selectedSubject.isBlank() ? selectedSubject : "Khác";
        }

        if (result.suggestedTags == null) {
            result.suggestedTags =
                    selectedTags != null ? new ArrayList<>(selectedTags) : new ArrayList<>();
        }

        if (result.safetyStatus == null || result.safetyStatus.isBlank()) {
            result.safetyStatus = "SAFE";
        }

        result.safetyStatus = result.safetyStatus.toUpperCase();

        if (!List.of("SAFE", "WARNING", "VIOLATION").contains(result.safetyStatus)) {
            result.safetyStatus = "WARNING";
        }

        if (result.safetyReason == null) {
            result.safetyReason = "";
        }

        if (Double.isNaN(result.tagConfidence) || result.tagConfidence < 0) {
            result.tagConfidence = 0.0;
        }

        if (result.tagConfidence > 1) {
            result.tagConfidence = 1.0;
        }
    }

    private List<String> readStringList(JsonNode jsonRes, String field, List<String> fallback) {
        List<String> values = new ArrayList<>();

        if (jsonRes.has(field) && jsonRes.get(field).isArray()) {
            for (JsonNode t : jsonRes.get(field)) {
                String value = t.asText("").trim();
                if (!value.isBlank()) {
                    values.add(value);
                }
            }
            return values;
        }

        return fallback != null ? fallback : new ArrayList<>();
    }

    private boolean isOpenAiConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    private String resolveBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "https://openrouter.ai/api/v1";
        }
        return baseUrl.replaceAll("/+$", "");
    }

    private String safeText(String value) {
        return value != null ? value : "";
    }

    private String limitText(String value) {
        if (value == null) return "";

        String clean = value.trim();
        if (clean.length() <= MAX_INPUT_CHARS) return clean;

        return clean.substring(0, MAX_INPUT_CHARS) + "\n...[nội dung đã được rút gọn để kiểm duyệt]";
    }

    private String extractChatCompletionText(JsonNode node) {
        if (node == null) return null;

        JsonNode choices = node.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            JsonNode content = choices.get(0).path("message").path("content");
            if (content.isTextual()) {
                return content.asText();
            }
        }

        return null;
    }

    private String cleanJsonText(String raw) {
        if (raw == null) return "{}";

        String cleaned = raw.trim();

        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7).trim();
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3).trim();
        }

        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3).trim();
        }

        int firstBrace = cleaned.indexOf('{');
        int lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        return cleaned;
    }
}
