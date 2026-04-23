package com.studymate.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class OpenAiDocumentService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    @Value("${app.openai.api-key:}")
    private String apiKey;

    @Value("${app.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${app.openai.model:gpt-4.1-mini}")
    private String model;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    public String extractText(String fileUrl, String type, String name) {
        try {
            Path filePath = resolvePhysicalPath(fileUrl);
            log.info("Reading document from path: {}", filePath);

            if (!Files.exists(filePath)) {
                throw new RuntimeException("File không tồn tại trên server: " + filePath);
            }

            byte[] bytes = Files.readAllBytes(filePath);
            String normalizedType = type == null ? "OTHER" : type.toUpperCase(Locale.ROOT);

            String extracted = switch (normalizedType) {
                case "PDF" -> readPdf(bytes);
                case "DOCX" -> readDocx(bytes);
                case "PPTX" -> readPptx(bytes);
                case "EXCEL" -> readExcel(bytes);
                case "TEXT" -> new String(bytes, StandardCharsets.UTF_8);
                default -> throw new RuntimeException("Chưa hỗ trợ đọc nội dung file loại: " + normalizedType + " (" + name + ")");
            };

            if (extracted == null || extracted.isBlank()) {
                throw new RuntimeException("Không đọc được nội dung từ tài liệu: " + name);
            }

            return extracted;
        } catch (IOException e) {
            throw new RuntimeException("Không thể đọc file tài liệu: " + e.getMessage(), e);
        }
    }

    public String summarize(String text, String docName) {
        String prompt = """
                Bạn là trợ lý học tập.
                Hãy tóm tắt tài liệu sau bằng tiếng Việt, rõ ràng, có cấu trúc:
                - Chủ đề chính
                - Ý quan trọng
                - Gạch đầu dòng dễ học
                - Kết luận ngắn

                Tên tài liệu: %s

                Nội dung:
                %s
                """.formatted(docName, limitText(text));

        return callForText(prompt);
    }

    public List<Map<String, Object>> generateFlashcards(String text, String docName) {
        String prompt = """
                Bạn là trợ lý học tập.
                Từ tài liệu sau, tạo đúng 8 flashcard bằng tiếng Việt.
                Chỉ trả về JSON hợp lệ dạng:
                [
                  {"question":"...","answer":"..."}
                ]

                Không thêm markdown, không thêm giải thích ngoài JSON.

                Tên tài liệu: %s

                Nội dung:
                %s
                """.formatted(docName, limitText(text));

        String raw = cleanJsonText(callForText(prompt));
        try {
            return objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.error("Flashcard JSON parse failed: {}", raw, e);
            throw new RuntimeException("AI trả về flashcard không đúng JSON");
        }
    }

    public List<Map<String, Object>> generateQuiz(String text, String docName) {
        String prompt = """
                Bạn là trợ lý học tập.
                Từ tài liệu sau, tạo đúng 6 câu trắc nghiệm bằng tiếng Việt.
                Mỗi câu có 4 lựa chọn.
                Chỉ trả về JSON hợp lệ dạng:
                [
                  {
                    "question":"...",
                    "options":["A","B","C","D"],
                    "correctIndex":0,
                    "explanation":"..."
                  }
                ]

                Không thêm markdown, không thêm giải thích ngoài JSON.

                Tên tài liệu: %s

                Nội dung:
                %s
                """.formatted(docName, limitText(text));

        String raw = cleanJsonText(callForText(prompt));
        try {
            return objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.error("Quiz JSON parse failed: {}", raw, e);
            throw new RuntimeException("AI trả về quiz không đúng JSON");
        }
    }

    public String answerQuestion(String text, String docName, String question) {
        String prompt = """
                Bạn là trợ lý học tập.
                Hãy trả lời câu hỏi của người dùng chỉ dựa trên tài liệu bên dưới.
                Nếu tài liệu không đủ thông tin, hãy nói rõ là tài liệu chưa đủ dữ liệu.
                Trả lời bằng tiếng Việt, ngắn gọn nhưng rõ ràng.

                Tên tài liệu: %s
                Câu hỏi: %s

                Nội dung tài liệu:
                %s
                """.formatted(docName, question, limitText(text));

        return callForText(prompt);
    }

    private String callForText(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("Thiếu OPENAI_API_KEY trong biến môi trường");
        }

        log.info("OpenAI key exists: {}", !apiKey.isBlank());
        log.info("OpenAI model: {}", model);
        log.info("OpenAI baseUrl: {}", baseUrl);

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("input", List.of(
                    Map.of(
                            "role", "system",
                            "content", List.of(
                                    Map.of("type", "input_text", "text", "Bạn là trợ lý học tập chính xác, súc tích.")
                            )
                    ),
                    Map.of(
                            "role", "user",
                            "content", List.of(
                                    Map.of("type", "input_text", "text", prompt)
                            )
                    )
            ));

            String requestJson = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/responses"))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            int status = response.statusCode();
            String responseBody = response.body();

            if (status == 429) {
                throw new RuntimeException("OpenAI đang giới hạn tần suất hoặc quota đã hết (429).");
            }

            if (status < 200 || status >= 300) {
                throw new RuntimeException("OpenAI trả lỗi HTTP " + status + ": " + responseBody);
            }

            JsonNode node = objectMapper.readTree(responseBody);
            String outputText = extractOutputText(node);

            if (outputText == null || outputText.isBlank()) {
                throw new RuntimeException("OpenAI không trả về nội dung hợp lệ");
            }

            return outputText.trim();
        } catch (IOException e) {
            log.error("OpenAI IO request failed", e);
            throw new RuntimeException("Không kết nối được tới OpenAI: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("OpenAI request interrupted", e);
            throw new RuntimeException("Yêu cầu tới OpenAI bị gián đoạn", e);
        } catch (Exception e) {
            log.error("OpenAI request failed", e);

            String msg = e.getMessage();
            if (msg != null && (
                    msg.contains("UnknownHostException")
                            || msg.contains("Failed to resolve")
                            || msg.contains("timed out")
            )) {
                throw new RuntimeException("Server không kết nối được tới OpenAI. Hãy kiểm tra mạng hoặc DNS.");
            }

            throw new RuntimeException("Lỗi gọi OpenAI: " + e.getMessage(), e);
        }
    }

    private String extractOutputText(JsonNode node) {
        if (node == null) return null;

        JsonNode outputText = node.get("output_text");
        if (outputText != null && !outputText.isNull() && !outputText.asText().isBlank()) {
            return outputText.asText();
        }

        JsonNode output = node.get("output");
        if (output != null && output.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode item : output) {
                JsonNode content = item.get("content");
                if (content == null || !content.isArray()) continue;

                for (JsonNode c : content) {
                    JsonNode directText = c.get("text");
                    if (directText != null && directText.isTextual()) {
                        sb.append(directText.asText()).append("\n");
                        continue;
                    }

                    JsonNode nestedText = c.path("text").path("value");
                    if (!nestedText.isMissingNode() && nestedText.isTextual()) {
                        sb.append(nestedText.asText()).append("\n");
                    }
                }
            }
            String result = sb.toString().trim();
            return result.isBlank() ? null : result;
        }

        return null;
    }

    private String cleanJsonText(String raw) {
        if (raw == null) return "[]";
        String cleaned = raw.trim();

        if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7).trim();
        else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3).trim();

        if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3).trim();

        return cleaned;
    }

    private Path resolvePhysicalPath(String fileUrl) {
        String relative = fileUrl.replaceFirst("^/uploads/", "");
        return Paths.get(uploadDir).toAbsolutePath().normalize().resolve(relative).normalize();
    }

    private String readPdf(byte[] bytes) throws IOException {
        try (var pdf = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(pdf);
        }
    }

    private String readDocx(byte[] bytes) throws IOException {
        try (var doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            StringBuilder sb = new StringBuilder();
            doc.getParagraphs().forEach(p -> {
                if (p.getText() != null && !p.getText().isBlank()) {
                    sb.append(p.getText()).append("\n");
                }
            });
            return sb.toString();
        }
    }

    private String readPptx(byte[] bytes) throws IOException {
        try (var ppt = new XMLSlideShow(new ByteArrayInputStream(bytes))) {
            StringBuilder sb = new StringBuilder();
            ppt.getSlides().forEach(slide -> {
                sb.append("Slide:\n");
                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape textShape) {
                        String text = textShape.getText();
                        if (text != null && !text.isBlank()) {
                            sb.append(text).append("\n");
                        }
                    }
                }
                sb.append("\n");
            });
            return sb.toString();
        }
    }

    private String readExcel(byte[] bytes) throws IOException {
        try (var wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            StringBuilder sb = new StringBuilder();
            wb.forEach(sheet -> {
                sb.append("Sheet: ").append(sheet.getSheetName()).append("\n");
                sheet.forEach(row -> {
                    row.forEach(cell -> sb.append(cell.toString()).append(" | "));
                    sb.append("\n");
                });
                sb.append("\n");
            });
            return sb.toString();
        }
    }

    private String limitText(String text) {
        if (text == null) return "";
        return text.length() > 18000 ? text.substring(0, 18000) : text;
    }
}