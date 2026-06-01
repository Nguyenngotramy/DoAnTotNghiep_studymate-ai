package com.studymate.service;

import com.studymate.model.Group;
import com.studymate.model.SavedSummary;
import com.studymate.model.StudyDocument;
import com.studymate.model.User;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.SavedSummaryRepository;
import com.studymate.repository.StudyDocumentRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SummaryService {

    private final SavedSummaryRepository summaryRepo;
    private final StudyDocumentRepository docRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;

    public List<SavedSummary> list(String userId, String search) {
        return summaryRepo.findByCreatedByIdOrderByUpdatedAtDesc(userId).stream()
                .filter(s -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    return (s.getTitle() != null && s.getTitle().toLowerCase().contains(q))
                            || (s.getSourceDocumentName() != null && s.getSourceDocumentName().toLowerCase().contains(q))
                            || (s.getContent() != null && s.getContent().toLowerCase().contains(q));
                })
                .collect(Collectors.toList());
    }

    public SavedSummary getOne(String userId, String summaryId) {
        return summaryRepo.findByIdAndCreatedById(summaryId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản tóm tắt"));
    }

    public SavedSummary saveFromDocument(
            String userId,
            String docId,
            String title,
            String content,
            String style,
            String length,
            String blogAppendix,
            List<String> relatedBlogTitles
    ) {
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Nội dung tóm tắt không được để trống");
        }

        StudyDocument doc = docRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài liệu"));

        Group group = groupRepo.findById(doc.getGroupId())
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        boolean isMember = group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m -> userId.equals(m.getUserId()));
        if (!isMember) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        String finalTitle = (title == null || title.isBlank())
                ? "Tóm tắt - " + doc.getName()
                : title.trim();

        SavedSummary summary = SavedSummary.builder()
                .title(finalTitle)
                .content(content.trim())
                .style(style == null ? "bullet" : style)
                .length(length == null ? "medium" : length)
                .createdById(userId)
                .createdByName(user.getFullName())
                .aiGenerated(true)
                .sourceDocumentId(doc.getId())
                .sourceDocumentName(doc.getName())
                .sourceGroupId(group.getId())
                .sourceGroupName(group.getName())
                .blogAppendix(blogAppendix == null ? "" : blogAppendix.trim())
                .relatedBlogTitles(relatedBlogTitles == null ? new ArrayList<>() : relatedBlogTitles)
                .build();

        return summaryRepo.save(summary);
    }

    public SavedSummary savePersonal(String userId, Map<String, Object> body) {
        String content = body.get("content") == null ? "" : body.get("content").toString();
        if (content.isBlank()) {
            throw new RuntimeException("Nội dung tóm tắt không được để trống");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        String title = body.get("title") == null ? "Tóm tắt cá nhân" : body.get("title").toString();

        SavedSummary summary = SavedSummary.builder()
                .title(title.trim())
                .content(content.trim())
                .style(body.get("style") == null ? "bullet" : body.get("style").toString())
                .length(body.get("length") == null ? "medium" : body.get("length").toString())
                .createdById(userId)
                .createdByName(user.getFullName())
                .aiGenerated(true)
                .build();

        return summaryRepo.save(summary);
    }

    public void delete(String userId, String summaryId) {
        SavedSummary summary = summaryRepo.findByIdAndCreatedById(summaryId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản tóm tắt"));
        summaryRepo.delete(summary);
    }
}
