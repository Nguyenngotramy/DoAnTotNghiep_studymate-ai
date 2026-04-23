package com.studymate.service;

import com.studymate.model.Group;
import com.studymate.model.QuizFolder;
import com.studymate.model.QuizSet;
import com.studymate.model.StudyDocument;
import com.studymate.model.User;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.QuizFolderRepository;
import com.studymate.repository.QuizSetRepository;
import com.studymate.repository.StudyDocumentRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizSetRepository quizSetRepo;
    private final QuizFolderRepository quizFolderRepo;
    private final StudyDocumentRepository docRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;

    public List<QuizSet> listQuizSets(
            String userId,
            String search,
            String folderId,
            String sourceType
    ) {
        return quizSetRepo.findByCreatedByIdOrderByUpdatedAtDesc(userId).stream()
                .filter(set -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    return (set.getTitle() != null && set.getTitle().toLowerCase().contains(q))
                            || (set.getSourceDocumentName() != null && set.getSourceDocumentName().toLowerCase().contains(q))
                            || (set.getSourceGroupName() != null && set.getSourceGroupName().toLowerCase().contains(q));
                })
                .filter(set -> {
                    if (folderId == null || folderId.isBlank()) return true;

                    if ("__NO_FOLDER__".equals(folderId)) {
                        return set.getFolderId() == null || set.getFolderId().isBlank();
                    }

                    return Objects.equals(folderId, set.getFolderId());
                })
                .filter(set -> {
                    if (sourceType == null || sourceType.isBlank() || "ALL".equalsIgnoreCase(sourceType)) return true;
                    return set.getSourceType().name().equalsIgnoreCase(sourceType);
                })
                .collect(Collectors.toList());
    }

    public QuizSet getOne(String userId, String quizId) {
        return quizSetRepo.findByIdAndCreatedById(quizId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ quiz"));
    }

    public List<QuizFolder> listFolders(String userId) {
        return quizFolderRepo.findByCreatedByIdOrderByCreatedAtDesc(userId);
    }

    public QuizFolder createFolder(String userId, String name, String color) {
        if (name == null || name.isBlank()) {
            throw new RuntimeException("Tên folder không được để trống");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        QuizFolder folder = QuizFolder.builder()
                .name(name.trim())
                .color((color == null || color.isBlank()) ? "#6366f1" : color.trim())
                .createdById(userId)
                .createdByName(user.getFullName())
                .build();

        return quizFolderRepo.save(folder);
    }

    public QuizSet createPersonalQuizSet(
            String userId,
            String title,
            String description,
            String folderId,
            List<Map<String, Object>> questionsInput
    ) {
        if (title == null || title.isBlank()) {
            throw new RuntimeException("Tên bộ quiz không được để trống");
        }

        List<QuizSet.Question> questions = mapQuestions(questionsInput);
        if (questions.isEmpty()) {
            throw new RuntimeException("Bộ quiz phải có ít nhất 1 câu hỏi");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        validateFolderOwner(userId, folderId);

        QuizSet quizSet = QuizSet.builder()
                .title(title.trim())
                .description(description == null ? "" : description.trim())
                .folderId(emptyToNull(folderId))
                .createdById(userId)
                .createdByName(user.getFullName())
                .aiGenerated(false)
                .sourceType(QuizSet.SourceType.PERSONAL)
                .questions(questions)
                .build();

        return quizSetRepo.save(quizSet);
    }

    public QuizSet saveAiQuizFromDocument(
            String userId,
            String docId,
            String title,
            String folderId,
            List<Map<String, Object>> questionsInput
    ) {
        StudyDocument doc = docRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài liệu"));

        Group group = groupRepo.findById(doc.getGroupId())
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        boolean isMember = group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m -> userId.equals(m.getUserId()));

        if (!isMember) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này");
        }

        validateFolderOwner(userId, folderId);

        List<QuizSet.Question> questions = mapQuestions(questionsInput);
        if (questions.isEmpty()) {
            throw new RuntimeException("Không có câu hỏi quiz để lưu");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        String finalTitle = (title == null || title.isBlank())
                ? "Quiz - " + doc.getName()
                : title.trim();

        QuizSet quizSet = QuizSet.builder()
                .title(finalTitle)
                .description("Tạo từ tài liệu bằng AI")
                .folderId(emptyToNull(folderId))
                .createdById(userId)
                .createdByName(user.getFullName())
                .aiGenerated(true)
                .sourceType(QuizSet.SourceType.DOCUMENT_AI)
                .sourceGroupId(group.getId())
                .sourceGroupName(group.getName())
                .sourceDocumentId(doc.getId())
                .sourceDocumentName(doc.getName())
                .questions(questions)
                .build();

        return quizSetRepo.save(quizSet);
    }

    public QuizSet moveQuizToFolder(String userId, String quizId, String folderId) {
        QuizSet quizSet = quizSetRepo.findByIdAndCreatedById(quizId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ quiz"));

        String normalizedFolderId = emptyToNull(folderId);
        validateFolderOwner(userId, normalizedFolderId);

        quizSet.setFolderId(normalizedFolderId);
        return quizSetRepo.save(quizSet);
    }

    public void deleteQuizSet(String userId, String quizId) {
        QuizSet quizSet = quizSetRepo.findByIdAndCreatedById(quizId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ quiz"));
        quizSetRepo.delete(quizSet);
    }

    private void validateFolderOwner(String userId, String folderId) {
        if (folderId == null || folderId.isBlank()) return;

        quizFolderRepo.findByIdAndCreatedById(folderId, userId)
                .orElseThrow(() -> new RuntimeException("Folder không hợp lệ"));
    }

    private List<QuizSet.Question> mapQuestions(List<Map<String, Object>> questionsInput) {
        if (questionsInput == null) return new ArrayList<>();

        List<QuizSet.Question> result = new ArrayList<>();
        int index = 0;

        for (Map<String, Object> item : questionsInput) {
            if (item == null) continue;

            String question = safeString(item.get("question"));
            String explanation = safeString(item.get("explanation"));
            Integer correctIndex = safeInteger(item.get("correctIndex"));

            List<String> options = new ArrayList<>();
            Object rawOptions = item.get("options");
            if (rawOptions instanceof List<?> list) {
                for (Object opt : list) {
                    String text = safeString(opt);
                    if (!text.isBlank()) {
                        options.add(text);
                    }
                }
            }

            if (question.isBlank() || options.size() < 2 || correctIndex == null) continue;
            if (correctIndex < 0 || correctIndex >= options.size()) continue;

            result.add(QuizSet.Question.builder()
                    .id(UUID.randomUUID().toString())
                    .question(question)
                    .options(options)
                    .correctIndex(correctIndex)
                    .explanation(explanation)
                    .orderIndex(index++)
                    .build());
        }

        return result;
    }

    private String safeString(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private Integer safeInteger(Object value) {
        if (value == null) return null;
        try {
            if (value instanceof Number number) {
                return number.intValue();
            }
            return Integer.parseInt(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}