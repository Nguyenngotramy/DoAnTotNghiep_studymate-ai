package com.studymate.service;

import com.studymate.model.User;
import com.studymate.model.VocabularySet;
import com.studymate.repository.UserRepository;
import com.studymate.repository.VocabularySetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VocabularySetService {

    private final VocabularySetRepository repo;
    private final UserRepository userRepo;

    public List<VocabularySet> list(String userId, String search) {
        return repo.findByCreatedByIdOrderByUpdatedAtDesc(userId).stream()
                .filter(v -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    return (v.getTitle() != null && v.getTitle().toLowerCase().contains(q));
                })
                .collect(Collectors.toList());
    }

    public VocabularySet getOne(String userId, String id) {
        return repo.findByIdAndCreatedById(id, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ từ vựng"));
    }

    public VocabularySet save(String userId, Map<String, Object> body) {
        String title = body.get("title") == null ? "Bộ từ vựng" : body.get("title").toString();
        if (title.isBlank()) throw new RuntimeException("Tên bộ từ vựng không được để trống");

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<VocabularySet.VocabEntry> entries = mapEntries(body.get("entries"));
        if (entries.isEmpty()) throw new RuntimeException("Cần ít nhất 1 từ vựng");

        VocabularySet.SourceType sourceType = VocabularySet.SourceType.MANUAL;
        if (body.get("sourceType") != null) {
            try {
                sourceType = VocabularySet.SourceType.valueOf(body.get("sourceType").toString().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                sourceType = VocabularySet.SourceType.MANUAL;
            }
        }

        VocabularySet set = VocabularySet.builder()
                .title(title.trim())
                .description(body.get("description") == null ? "" : body.get("description").toString())
                .folderId(emptyToNull(body.get("folderId")))
                .createdById(userId)
                .createdByName(user.getFullName())
                .sourceType(sourceType)
                .entries(entries)
                .build();

        return repo.save(set);
    }

    public void delete(String userId, String id) {
        VocabularySet set = getOne(userId, id);
        repo.delete(set);
    }

    @SuppressWarnings("unchecked")
    private List<VocabularySet.VocabEntry> mapEntries(Object raw) {
        List<VocabularySet.VocabEntry> result = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return result;
        int i = 0;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) continue;
            String tu = pick(map, "tu_vung", "tuVung", "word");
            String nghia = pick(map, "nghia", "meaning");
            if (tu.isBlank() && nghia.isBlank()) continue;
            if (tu.isBlank()) tu = nghia;
            if (nghia.isBlank()) nghia = tu;
            result.add(VocabularySet.VocabEntry.builder()
                    .tuVung(tu)
                    .nghia(nghia)
                    .viDu(pick(map, "vi_du", "viDu", "example"))
                    .phatAm(pick(map, "phat_am", "phatAm", "pronunciation"))
                    .orderIndex(i++)
                    .build());
        }
        return result;
    }

    private String pick(Map<?, ?> map, String... keys) {
        for (String k : keys) {
            Object v = map.get(k);
            if (v != null && !v.toString().isBlank()) return v.toString().trim();
        }
        return "";
    }

    private String emptyToNull(Object value) {
        if (value == null) return null;
        String s = value.toString().trim();
        return s.isEmpty() ? null : s;
    }
}
