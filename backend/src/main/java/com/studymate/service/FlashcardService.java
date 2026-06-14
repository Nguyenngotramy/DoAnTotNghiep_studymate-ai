package com.studymate.service;

import com.studymate.dto.response.FlashcardCardProgressView;
import com.studymate.dto.response.FlashcardStudySummaryResponse;
import com.studymate.model.FlashcardCardProgress;
import com.studymate.model.FlashcardDeck;
import com.studymate.model.FlashcardFolder;
import com.studymate.model.Group;
import com.studymate.model.StudyDocument;
import com.studymate.model.User;
import com.studymate.repository.FlashcardCardProgressRepository;
import com.studymate.repository.FlashcardDeckRepository;
import com.studymate.repository.FlashcardFolderRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.StudyDocumentRepository;
import com.studymate.repository.UserRepository;
import com.studymate.util.Sm2Scheduler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlashcardService {

    private final FlashcardDeckRepository deckRepo;
    private final FlashcardFolderRepository folderRepo;
    private final FlashcardCardProgressRepository progressRepo;
    private final NotificationService notificationService;
    private final StudyDocumentRepository docRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final StreakService streakService;

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

    public FlashcardDeck createAiDeckFromChat(
            String userId,
            String title,
            String description,
            List<Map<String, String>> cardsInput
    ) {
        if (title == null || title.isBlank()) {
            throw new RuntimeException("Ten bo the khong duoc de trong");
        }

        List<FlashcardDeck.Card> cards = mapCards(cardsInput);
        if (cards.isEmpty()) {
            throw new RuntimeException("JSON flashcard khong co the hop le");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay nguoi dung"));

        FlashcardDeck deck = FlashcardDeck.builder()
                .title(title.trim())
                .description(description == null ? "" : description.trim())
                .folderId(null)
                .createdById(userId)
                .createdByName(user.getFullName())
                .aiGenerated(true)
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
        progressRepo.deleteByUserIdAndDeckId(userId, deckId);
        deckRepo.delete(deck);
    }

    public FlashcardStudySummaryResponse getStudySummary(String userId, String deckId) {
        FlashcardDeck deck = getOne(userId, deckId);
        Instant now = Instant.now();

        Map<String, FlashcardCardProgress> progressByCard = progressRepo.findByUserIdAndDeckId(userId, deckId)
                .stream()
                .collect(Collectors.toMap(FlashcardCardProgress::getCardId, p -> p, (a, b) -> a));

        List<FlashcardCardProgressView> views = new ArrayList<>();
        int dueCount = 0;
        int newCount = 0;

        for (FlashcardDeck.Card card : deck.getCards()) {
            FlashcardCardProgress progress = progressByCard.get(card.getId());
            boolean isNew = progress == null;
            boolean due = isNew || Sm2Scheduler.isDue(progress, now);

            if (isNew) {
                newCount++;
            }
            if (due) {
                dueCount++;
            }

            if (progress != null) {
                views.add(FlashcardCardProgressView.builder()
                        .cardId(card.getId())
                        .easeFactor(progress.getEaseFactor())
                        .intervalDays(progress.getIntervalDays())
                        .repetitions(progress.getRepetitions())
                        .nextReviewAt(progress.getNextReviewAt())
                        .lastReviewedAt(progress.getLastReviewedAt())
                        .due(due)
                        .isNew(false)
                        .build());
            } else {
                views.add(FlashcardCardProgressView.builder()
                        .cardId(card.getId())
                        .easeFactor(2.5)
                        .intervalDays(0)
                        .repetitions(0)
                        .due(true)
                        .isNew(true)
                        .build());
            }
        }

        return FlashcardStudySummaryResponse.builder()
                .deckId(deckId)
                .totalCards(deck.getCards().size())
                .dueCount(dueCount)
                .newCount(newCount)
                .cards(views)
                .build();
    }

    public FlashcardCardProgressView recordReview(
            String userId,
            String deckId,
            String cardId,
            String ratingRaw
    ) {
        FlashcardDeck deck = getOne(userId, deckId);

        boolean cardExists = deck.getCards().stream().anyMatch(c -> Objects.equals(c.getId(), cardId));
        if (!cardExists) {
            throw new RuntimeException("Thẻ không thuộc bộ flashcard này");
        }

        FlashcardCardProgress.Rating rating;
        try {
            rating = FlashcardCardProgress.Rating.valueOf(ratingRaw.trim().toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Mức đánh giá không hợp lệ (AGAIN, HARD, GOOD, EASY)");
        }

        FlashcardCardProgress progress = progressRepo
                .findByUserIdAndDeckIdAndCardId(userId, deckId, cardId)
                .orElseGet(() -> FlashcardCardProgress.builder()
                        .userId(userId)
                        .deckId(deckId)
                        .cardId(cardId)
                        .build());

        Sm2Scheduler.applyReview(progress, rating);
        progress = progressRepo.save(progress);
        streakService.applyStudyStreak(userId);

        if (rating == FlashcardCardProgress.Rating.AGAIN) {
            notificationService.send(
                    userId,
                    "Cần ôn lại flashcard",
                    "Một thẻ trong \"" + deck.getTitle() + "\" cần ôn lại sớm. Tiếp tục trong phiên hoặc mở Flashcard.",
                    "FLASHCARD_REVIEW",
                    "/flashcard"
            );
        }

        Instant now = Instant.now();
        boolean due = Sm2Scheduler.isDue(progress, now);

        return FlashcardCardProgressView.builder()
                .cardId(cardId)
                .easeFactor(progress.getEaseFactor())
                .intervalDays(progress.getIntervalDays())
                .repetitions(progress.getRepetitions())
                .nextReviewAt(progress.getNextReviewAt())
                .lastReviewedAt(progress.getLastReviewedAt())
                .due(due)
                .isNew(false)
                .build();
    }

    public void notifyStudySessionComplete(String userId, String deckId, int needReviewCount) {
        if (needReviewCount <= 0) {
            return;
        }
        FlashcardDeck deck = getOne(userId, deckId);
        notificationService.send(
                userId,
                "Có thẻ cần ôn lại",
                String.format(
                        "Phiên \"%s\": %d thẻ cần ôn lại. Hãy quay lại ôn trong ngày.",
                        deck.getTitle(),
                        needReviewCount
                ),
                "FLASHCARD_REVIEW",
                "/flashcard"
        );
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
