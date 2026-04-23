package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.SavedStudyItem;
import com.studymate.service.SavedStudyItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/study-drive")
@RequiredArgsConstructor
public class SavedStudyItemController {

    private final SavedStudyItemService service;

    @GetMapping
    public ResponseEntity<?> list(
            Authentication auth,
            @RequestParam(required = false) String folderId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(service.list(auth.getName(), folderId)));
    }

    @PostMapping("/save-post")
    public ResponseEntity<?> savePost(Authentication auth, @RequestBody SavedStudyItem body) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.savePost(auth.getName(), body),
                "Đã lưu vào học tập cá nhân"
        ));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            Authentication auth,
            @RequestParam(value = "folderId", required = false) String folderId,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.uploadFile(auth.getName(), folderId, file),
                "Upload vào học tập cá nhân thành công"
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(Authentication auth, @PathVariable String id) {
        service.delete(auth.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá mục đã lưu"));
    }
}