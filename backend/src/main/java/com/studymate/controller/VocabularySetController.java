package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.service.VocabularySetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/vocabulary-sets")
@RequiredArgsConstructor
public class VocabularySetController {

    private final VocabularySetService service;

    @GetMapping
    public ResponseEntity<?> list(
            Authentication auth,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.list(auth.getName(), search)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.getOne(auth.getName(), id)));
    }

    @PostMapping
    public ResponseEntity<?> save(Authentication auth, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.save(auth.getName(), body),
                "Đã lưu bộ từ vựng"
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        service.delete(auth.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bộ từ vựng"));
    }
}
