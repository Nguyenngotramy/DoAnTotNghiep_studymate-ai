package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.FlashcardDeck;
import com.studymate.model.FlashcardFolder;
import com.studymate.service.FlashcardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardService flashcardService;

    @GetMapping("/flashcards")
    public ResponseEntity<?> listDecks(
            Authentication auth,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String folderId,
            @RequestParam(required = false) String sourceType
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                flashcardService.listDecks(auth.getName(), search, folderId, sourceType)
        ));
    }

    @GetMapping("/flashcards/{deckId}")
    public ResponseEntity<?> getOne(@PathVariable String deckId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                flashcardService.getOne(auth.getName(), deckId)
        ));
    }

    @DeleteMapping("/flashcards/{deckId}")
    public ResponseEntity<?> deleteDeck(@PathVariable String deckId, Authentication auth) {
        flashcardService.deleteDeck(auth.getName(), deckId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bộ flashcard"));
    }

    @PatchMapping("/flashcards/{deckId}/move-folder")
    public ResponseEntity<?> moveDeckToFolder(
            @PathVariable String deckId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        FlashcardDeck deck = flashcardService.moveDeckToFolder(
                auth.getName(),
                deckId,
                body.get("folderId")
        );
        return ResponseEntity.ok(ApiResponse.ok(deck, "Đã chuyển bộ flashcard vào folder"));
    }

    @GetMapping("/flashcard-folders")
    public ResponseEntity<?> listFolders(Authentication auth) {
        List<FlashcardFolder> folders = flashcardService.listFolders(auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(folders));
    }

    @PostMapping("/flashcard-folders")
    public ResponseEntity<?> createFolder(Authentication auth, @RequestBody Map<String, String> body) {
        FlashcardFolder folder = flashcardService.createFolder(
                auth.getName(),
                body.get("name"),
                body.get("color")
        );
        return ResponseEntity.ok(ApiResponse.ok(folder, "Tạo folder thành công"));
    }

    @PostMapping("/flashcards")
    public ResponseEntity<?> createPersonalDeck(Authentication auth, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> cards = (List<Map<String, String>>) body.get("cards");

        FlashcardDeck deck = flashcardService.createPersonalDeck(
                auth.getName(),
                body.get("title") == null ? "" : body.get("title").toString(),
                body.get("description") == null ? "" : body.get("description").toString(),
                body.get("folderId") == null ? null : body.get("folderId").toString(),
                cards
        );

        return ResponseEntity.ok(ApiResponse.ok(deck, "Tạo bộ flashcard thành công"));
    }

    @PostMapping("/flashcards/from-document")
    public ResponseEntity<?> saveFromDocument(Authentication auth, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> cards = (List<Map<String, String>>) body.get("cards");

        FlashcardDeck deck = flashcardService.saveAiDeckFromDocument(
                auth.getName(),
                body.get("docId") == null ? "" : body.get("docId").toString(),
                body.get("title") == null ? "" : body.get("title").toString(),
                body.get("folderId") == null ? null : body.get("folderId").toString(),
                cards
        );

        return ResponseEntity.ok(ApiResponse.ok(deck, "Đã lưu bộ flashcard từ tài liệu"));
    }
}