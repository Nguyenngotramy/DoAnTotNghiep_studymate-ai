package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.QuizFolder;
import com.studymate.model.QuizSet;
import com.studymate.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @GetMapping("/quizzes")
    public ResponseEntity<?> listQuizSets(
            Authentication auth,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String folderId,
            @RequestParam(required = false) String sourceType
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                quizService.listQuizSets(auth.getName(), search, folderId, sourceType)
        ));
    }

    @GetMapping("/quizzes/{quizId}")
    public ResponseEntity<?> getOne(@PathVariable String quizId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                quizService.getOne(auth.getName(), quizId)
        ));
    }

    @DeleteMapping("/quizzes/{quizId}")
    public ResponseEntity<?> deleteQuizSet(@PathVariable String quizId, Authentication auth) {
        quizService.deleteQuizSet(auth.getName(), quizId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bộ quiz"));
    }

    @PatchMapping("/quizzes/{quizId}/move-folder")
    public ResponseEntity<?> moveQuizToFolder(
            @PathVariable String quizId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        QuizSet quizSet = quizService.moveQuizToFolder(
                auth.getName(),
                quizId,
                body.get("folderId")
        );
        return ResponseEntity.ok(ApiResponse.ok(quizSet, "Đã chuyển bộ quiz vào folder"));
    }

    @GetMapping("/quiz-folders")
    public ResponseEntity<?> listFolders(Authentication auth) {
        List<QuizFolder> folders = quizService.listFolders(auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(folders));
    }

    @PostMapping("/quiz-folders")
    public ResponseEntity<?> createFolder(Authentication auth, @RequestBody Map<String, String> body) {
        QuizFolder folder = quizService.createFolder(
                auth.getName(),
                body.get("name"),
                body.get("color")
        );
        return ResponseEntity.ok(ApiResponse.ok(folder, "Tạo folder thành công"));
    }

    @PostMapping("/quizzes")
    public ResponseEntity<?> createPersonalQuiz(Authentication auth, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> questions = (List<Map<String, Object>>) body.get("questions");

        QuizSet quizSet = quizService.createPersonalQuizSet(
                auth.getName(),
                body.get("title") == null ? "" : body.get("title").toString(),
                body.get("description") == null ? "" : body.get("description").toString(),
                body.get("folderId") == null ? null : body.get("folderId").toString(),
                questions
        );

        return ResponseEntity.ok(ApiResponse.ok(quizSet, "Tạo bộ quiz thành công"));
    }

    @PostMapping("/quizzes/from-document")
    public ResponseEntity<?> saveFromDocument(Authentication auth, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> questions = (List<Map<String, Object>>) body.get("questions");

        QuizSet quizSet = quizService.saveAiQuizFromDocument(
                auth.getName(),
                body.get("docId") == null ? "" : body.get("docId").toString(),
                body.get("title") == null ? "" : body.get("title").toString(),
                body.get("folderId") == null ? null : body.get("folderId").toString(),
                questions
        );

        return ResponseEntity.ok(ApiResponse.ok(quizSet, "Đã lưu bộ quiz từ tài liệu"));
    }
}