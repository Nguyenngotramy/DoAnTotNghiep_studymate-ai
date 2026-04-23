package com.studymate.service;

import com.studymate.model.ChatMessage;
import com.studymate.model.Group;
import com.studymate.model.StudyDocument;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.StudyDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final StudyDocumentRepository docRepo;
    private final GroupRepository groupRepo;
    private final OpenAiDocumentService openAiDocumentService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public List<StudyDocument> getByGroup(String groupId, String userId) {
        validateMember(groupId, userId);
        return docRepo.findByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public StudyDocument getOne(String docId) {
        return docRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài liệu"));
    }

    public StudyDocument upload(String groupId, String uploaderId, String uploaderName, MultipartFile file) {
        validateMember(groupId, uploaderId);

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File tải lên đang trống");
        }

        try {
            String originalName = Objects.requireNonNullElse(file.getOriginalFilename(), "file");
            String safeOriginalName = sanitizeFilename(originalName);
            safeOriginalName = normalizeDuplicateExtension(safeOriginalName);

            String type = getType(safeOriginalName);
            String filename = UUID.randomUUID() + "_" + safeOriginalName;

            Path dir = Paths.get(uploadDir, groupId).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            Path target = dir.resolve(filename).normalize();
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            StudyDocument doc = StudyDocument.builder()
                    .groupId(groupId)
                    .name(safeOriginalName)
                    .fileUrl("/uploads/" + groupId + "/" + filename)
                    .type(type)
                    .sizeKb(Math.max(1, file.getSize() / 1024))
                    .uploaderId(uploaderId)
                    .uploaderName(uploaderName)
                    .sourceType(StudyDocument.SourceType.PAGE)
                    .build();

            return docRepo.save(doc);
        } catch (IOException e) {
            log.error("Upload document failed for group {}: {}", groupId, e.getMessage(), e);
            throw new RuntimeException("Lỗi upload file: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected upload error for group {}: {}", groupId, e.getMessage(), e);
            throw new RuntimeException("Không thể upload tài liệu: " + e.getMessage());
        }
    }

    public void createFromChatAttachments(
            String groupId,
            String userId,
            String userName,
            String messageId,
            List<ChatMessage.Attachment> attachments
    ) {
        if (attachments == null || attachments.isEmpty()) return;

        List<StudyDocument> existingDocs = docRepo.findByGroupIdOrderByCreatedAtDesc(groupId);

        for (ChatMessage.Attachment attachment : attachments) {
            if (attachment == null || attachment.getUrl() == null || attachment.getUrl().isBlank()) {
                continue;
            }

            boolean exists = existingDocs.stream()
                    .anyMatch(d ->
                            Objects.equals(d.getMessageId(), messageId) &&
                                    Objects.equals(d.getFileUrl(), attachment.getUrl())
                    );

            if (exists) continue;

            String cleanName = attachment.getName();
            if (cleanName != null) {
                cleanName = sanitizeFilename(cleanName);
                cleanName = normalizeDuplicateExtension(cleanName);
            }

            StudyDocument doc = StudyDocument.builder()
                    .groupId(groupId)
                    .name(cleanName)
                    .fileUrl(attachment.getUrl())
                    .type(normalizeType(attachment.getType()))
                    .sizeKb(Math.max(1, attachment.getSizeKb()))
                    .uploaderId(userId)
                    .uploaderName(userName)
                    .sourceType(StudyDocument.SourceType.CHAT)
                    .messageId(messageId)
                    .build();

            docRepo.save(doc);
        }
    }

    public Map<String, String> summarize(String docId, String userId) {
        StudyDocument doc = getOne(docId);
        validateMember(doc.getGroupId(), userId);

        String text = openAiDocumentService.extractText(doc.getFileUrl(), doc.getType(), doc.getName());
        String summary = openAiDocumentService.summarize(text, doc.getName());

        return Map.of("summary", summary);
    }

    public List<Map<String, Object>> generateFlashcards(String docId, String userId) {
        StudyDocument doc = getOne(docId);
        validateMember(doc.getGroupId(), userId);

        String text = openAiDocumentService.extractText(doc.getFileUrl(), doc.getType(), doc.getName());
        return openAiDocumentService.generateFlashcards(text, doc.getName());
    }

    public List<Map<String, Object>> generateQuiz(String docId, String userId) {
        StudyDocument doc = getOne(docId);
        validateMember(doc.getGroupId(), userId);

        String text = openAiDocumentService.extractText(doc.getFileUrl(), doc.getType(), doc.getName());
        return openAiDocumentService.generateQuiz(text, doc.getName());
    }

    public Map<String, String> chatWithDoc(String docId, String userId, String question) {
        StudyDocument doc = getOne(docId);
        validateMember(doc.getGroupId(), userId);

        if (question == null || question.isBlank()) {
            throw new RuntimeException("Câu hỏi không được để trống");
        }

        String text = openAiDocumentService.extractText(doc.getFileUrl(), doc.getType(), doc.getName());
        String answer = openAiDocumentService.answerQuestion(text, doc.getName(), question.trim());

        return Map.of("answer", answer);
    }

    public void delete(String groupId, String docId, String userId) {
        validateMember(groupId, userId);

        StudyDocument doc = docRepo.findByIdAndGroupId(docId, groupId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài liệu"));

        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        boolean isLeader = group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m ->
                        userId.equals(m.getUserId()) &&
                                (m.getRole() == Group.Role.LEADER || m.getRole() == Group.Role.DEPUTY)
                );

        boolean isOwner = userId.equals(doc.getUploaderId());

        if (!isLeader && !isOwner) {
            throw new RuntimeException("Bạn không có quyền xoá tài liệu này");
        }

        if (doc.getSourceType() != StudyDocument.SourceType.CHAT) {
            try {
                String relativePath = doc.getFileUrl().replaceFirst("^/uploads/", "");
                Path path = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(relativePath).normalize();
                Files.deleteIfExists(path);
            } catch (IOException e) {
                log.warn("Không thể xoá file vật lý {}: {}", doc.getFileUrl(), e.getMessage());
            }
        }

        docRepo.delete(doc);
    }

    private void validateMember(String groupId, String userId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        boolean isMember = group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m -> userId.equals(m.getUserId()));

        if (!isMember) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này");
        }
    }

    private String sanitizeFilename(String filename) {
        return filename
                .replace("\\", "_")
                .replace("/", "_")
                .replace(":", "_")
                .replace("*", "_")
                .replace("?", "_")
                .replace("\"", "_")
                .replace("<", "_")
                .replace(">", "_")
                .replace("|", "_")
                .trim();
    }

    private String normalizeDuplicateExtension(String filename) {
        if (filename == null || filename.isBlank()) return filename;

        String lower = filename.toLowerCase(Locale.ROOT);

        if (lower.endsWith(".pdf.pdf")) {
            return filename.substring(0, filename.length() - 4);
        }
        if (lower.endsWith(".doc.doc")) {
            return filename.substring(0, filename.length() - 4);
        }
        if (lower.endsWith(".docx.docx")) {
            return filename.substring(0, filename.length() - 5);
        }
        if (lower.endsWith(".ppt.ppt")) {
            return filename.substring(0, filename.length() - 4);
        }
        if (lower.endsWith(".pptx.pptx")) {
            return filename.substring(0, filename.length() - 5);
        }
        if (lower.endsWith(".xls.xls")) {
            return filename.substring(0, filename.length() - 4);
        }
        if (lower.endsWith(".xlsx.xlsx")) {
            return filename.substring(0, filename.length() - 5);
        }
        if (lower.endsWith(".csv.csv")) {
            return filename.substring(0, filename.length() - 4);
        }
        if (lower.endsWith(".txt.txt")) {
            return filename.substring(0, filename.length() - 4);
        }
        if (lower.endsWith(".jpg.jpg")) {
            return filename.substring(0, filename.length() - 4);
        }
        if (lower.endsWith(".jpeg.jpeg")) {
            return filename.substring(0, filename.length() - 5);
        }
        if (lower.endsWith(".png.png")) {
            return filename.substring(0, filename.length() - 4);
        }

        return filename;
    }

    private String getType(String filename) {
        String ext = filename.toLowerCase(Locale.ROOT);
        if (ext.endsWith(".pdf")) return "PDF";
        if (ext.endsWith(".docx") || ext.endsWith(".doc")) return "DOCX";
        if (ext.endsWith(".pptx") || ext.endsWith(".ppt")) return "PPTX";
        if (ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".csv")) return "EXCEL";
        if (ext.endsWith(".jpg") || ext.endsWith(".png") || ext.endsWith(".jpeg")) return "IMAGE";
        if (ext.endsWith(".txt")) return "TEXT";
        return "OTHER";
    }

    private String normalizeType(String type) {
        if (type == null || type.isBlank()) return "OTHER";
        String t = type.toUpperCase(Locale.ROOT);
        if ("CSV".equals(t)) return "EXCEL";
        return t;
    }
}