package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.repository.UserRepository;
import com.studymate.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService docService;
    private final UserRepository userRepo;

    @GetMapping("/groups/{groupId}/documents")
    public ResponseEntity<?> list(@PathVariable String groupId, Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(docService.getByGroup(groupId, auth.getName()))
        );
    }

    @PostMapping("/groups/{groupId}/documents")
    public ResponseEntity<?> upload(
            @PathVariable String groupId,
            Authentication auth,
            @RequestParam("file") MultipartFile file
    ) {
        var user = userRepo.findById(auth.getName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return ResponseEntity.ok(
                ApiResponse.ok(
                        docService.upload(groupId, auth.getName(), user.getFullName(), file),
                        "Upload thành công!"
                )
        );
    }

    @PostMapping("/documents/{docId}/summarize")
    public ResponseEntity<?> summarize(@PathVariable String docId, Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(docService.summarize(docId, auth.getName()))
        );
    }

    @PostMapping("/documents/{docId}/flashcards")
    public ResponseEntity<?> flashcards(@PathVariable String docId, Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(docService.generateFlashcards(docId, auth.getName()))
        );
    }

    @PostMapping("/documents/{docId}/quiz")
    public ResponseEntity<?> quiz(@PathVariable String docId, Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(docService.generateQuiz(docId, auth.getName()))
        );
    }

    @PostMapping("/documents/{docId}/chat")
    public ResponseEntity<?> chatWithDoc(
            @PathVariable String docId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        String question = body.get("question");
        return ResponseEntity.ok(
                ApiResponse.ok(docService.chatWithDoc(docId, auth.getName(), question))
        );
    }

    @DeleteMapping("/groups/{groupId}/documents/{docId}")
    public ResponseEntity<?> delete(
            @PathVariable String groupId,
            @PathVariable String docId,
            Authentication auth
    ) {
        docService.delete(groupId, docId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá tài liệu"));
    }
}