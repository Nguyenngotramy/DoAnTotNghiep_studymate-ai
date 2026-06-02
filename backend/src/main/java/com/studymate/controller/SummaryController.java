package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SummaryController {

    private final SummaryService summaryService;

    @GetMapping("/summaries")
    public ResponseEntity<?> list(
            Authentication auth,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                summaryService.list(auth.getName(), search)
        ));
    }

    @GetMapping("/summaries/{summaryId}")
    public ResponseEntity<?> getOne(@PathVariable String summaryId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                summaryService.getOne(auth.getName(), summaryId)
        ));
    }

    @PostMapping("/summaries/from-document")
    public ResponseEntity<?> saveFromDocument(Authentication auth, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> blogTitles = body.get("relatedBlogTitles") instanceof List<?> list
                ? list.stream().map(Object::toString).toList()
                : List.of();

        var summary = summaryService.saveFromDocument(
                auth.getName(),
                body.get("docId") == null ? "" : body.get("docId").toString(),
                body.get("title") == null ? "" : body.get("title").toString(),
                body.get("content") == null ? "" : body.get("content").toString(),
                body.get("style") == null ? "bullet" : body.get("style").toString(),
                body.get("length") == null ? "medium" : body.get("length").toString(),
                body.get("blogAppendix") == null ? "" : body.get("blogAppendix").toString(),
                blogTitles
        );

        return ResponseEntity.ok(ApiResponse.ok(summary, "Đã lưu bản tóm tắt"));
    }

    @PostMapping("/summaries")
    public ResponseEntity<?> savePersonal(Authentication auth, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                summaryService.savePersonal(auth.getName(), body),
                "Đã lưu bản tóm tắt"
        ));
    }

    @DeleteMapping("/summaries/{summaryId}")
    public ResponseEntity<?> delete(@PathVariable String summaryId, Authentication auth) {
        summaryService.delete(auth.getName(), summaryId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bản tóm tắt"));
    }
}
