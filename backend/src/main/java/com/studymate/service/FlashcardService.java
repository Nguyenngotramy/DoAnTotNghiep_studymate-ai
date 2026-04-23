package com.studymate.service;

import com.studymate.model.FlashcardDeck;
import com.studymate.model.FlashcardFolder;
import com.studymate.model.Group;
import com.studymate.model.StudyDocument;
import com.studymate.model.User;
import com.studymate.repository.FlashcardDeckRepository;
import com.studymate.repository.FlashcardFolderRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.StudyDocumentRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlashcardService {

    private final FlashcardDeckRepository deckRepo;
    private final FlashcardFolderRepository folderRepo;
    private final StudyDocumentRepository docRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;

    public List<FlashcardDeck> listDecks(
            String userId,
            String search,
            String folderId,
            String sourceType
    ) {
        return deckRepo.findByCreatedByIdOrderByUpdatedAtDesc(userId).stream()
                .filter(deck -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    return (deck.getTitle() != null && deck.getTitle().toLowerCase().contains(q))
                            || (deck.getSourceDocumentName() != null && deck.getSourceDocumentName().toLowerCase().contains(q))
                            || (deck.getSourceGroupName() != null && deck.getSourceGroupName().toLowerCase().contains(q));
                })
                .filter(deck -> {
                    if (folderId == null || folderId.isBlank()) return true;

                    if ("__NO_FOLDER__".equals(folderId)) {
                        return deck.getFolderId() == null || deck.getFolderId().isBlank();
                    }

                    return Objects.equals(folderId, deck.getFolderId());
                })
                .filter(deck -> {
                    if (sourceType == null || sourceType.isBlank() || "ALL".equalsIgnoreCase(sourceType)) return true;
                    return deck.getSourceType().name().equalsIgnoreCase(sourceType);
                })
                .collect(Collectors.toList());
    }

    public FlashcardDeck getOne(String userId, String deckId) {
        return deckRepo.findByIdAndCreatedById(deckId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ flashcard"));
    }

    public List<FlashcardFolder> listFolders(String userId) {
        return folderRepo.findByCreatedByIdOrderByCreatedAtDesc(userId);
    }

    public FlashcardFolder createFolder(String userId, String name, String color) {
        if (name == null || name.isBlank()) {
            throw new RuntimeException("Tên folder không được để trống");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        FlashcardFolder folder = FlashcardFolder.builder()
                .name(name.trim())
                .color((color == null || color.isBlank()) ? "#6366f1" : color.trim())
                .createdById(userId)
                .createdByName(user.getFullName())
                .build();

        return folderRepo.save(folder);
    }

    public FlashcardDeck createPersonalDeck(
            String userId,
            String title,
            String description,
            String folderId,
            List<Map<String, String>> cardsInput
    ) {
        if (title == null || title.isBlank()) {
            throw new RuntimeException("Tên bộ thẻ không được để trống");
        }

        List<FlashcardDeck.Card> cards = mapCards(cardsInput);
        if (cards.isEmpty()) {
            throw new RuntimeException("Bộ thẻ phải có ít nhất 1 flashcard");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        validateFolderOwner(userId, folderId);

        FlashcardDeck deck = FlashcardDeck.builder()
                .title(title.trim())
                .description(description == null ? "" : description.trim())
                .folderId(emptyToNull(folderId))
                .createdById(userId)
                .createdByName(user.getFullName())
                .aiGenerated(false)
                .sourceType(FlashcardDeck.SourceType.PERSONAL)
                .cards(cards)
                .build();

        return deckRepo.save(deck);
    }

    public FlashcardDeck saveAiDeckFromDocument(
            String userId,
            String docId,
            String title,
            String folderId,
            List<Map<String, String>> cardsInput
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

        List<FlashcardDeck.Card> cards = mapCards(cardsInput);
        if (cards.isEmpty()) {
            throw new RuntimeException("Không có flashcard để lưu");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        String finalTitle = (title == null || title.isBlank())
                ? "Flashcard - " + doc.getName()
                : title.trim();

        FlashcardDeck deck = FlashcardDeck.builder()
                .title(finalTitle)
                .description("Tạo từ tài liệu bằng AI")
                .folderId(emptyToNull(folderId))
                .createdById(userId)
                .createdByName(user.getFullName())
                .aiGenerated(true)
                .sourceType(FlashcardDeck.SourceType.DOCUMENT_AI)
                .sourceGroupId(group.getId())
                .sourceGroupName(group.getName())
                .sourceDocumentId(doc.getId())
                .sourceDocumentName(doc.getName())
                .cards(cards)
                .build();

        return deckRepo.save(deck);
    }

    public FlashcardDeck moveDeckToFolder(String userId, String deckId, String folderId) {
        FlashcardDeck deck = deckRepo.findByIdAndCreatedById(deckId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ flashcard"));

        String normalizedFolderId = emptyToNull(folderId);
        validateFolderOwner(userId, normalizedFolderId);

        deck.setFolderId(normalizedFolderId);
        return deckRepo.save(deck);
    }

    public void deleteDeck(String userId, String deckId) {
        FlashcardDeck deck = deckRepo.findByIdAndCreatedById(deckId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ flashcard"));
        deckRepo.delete(deck);
    }

    private void validateFolderOwner(String userId, String folderId) {
        if (folderId == null || folderId.isBlank()) return;

        folderRepo.findByIdAndCreatedById(folderId, userId)
                .orElseThrow(() -> new RuntimeException("Folder không hợp lệ"));
    }

    private List<FlashcardDeck.Card> mapCards(List<Map<String, String>> cardsInput) {
        if (cardsInput == null) return new ArrayList<>();

        List<FlashcardDeck.Card> result = new ArrayList<>();
        int index = 0;

        for (Map<String, String> item : cardsInput) {
            if (item == null) continue;

            String question = safe(item.get("question"));
            String answer = safe(item.get("answer"));

            if (question.isBlank() || answer.isBlank()) continue;

            result.add(FlashcardDeck.Card.builder()
                    .id(UUID.randomUUID().toString())
                    .question(question)
                    .answer(answer)
                    .orderIndex(index++)
                    .build());
        }

        return result;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}