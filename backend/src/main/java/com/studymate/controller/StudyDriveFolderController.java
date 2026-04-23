package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.service.StudyDriveFolderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/study-drive/folders")
@RequiredArgsConstructor
public class StudyDriveFolderController {

    private final StudyDriveFolderService folderService;

    @GetMapping
    public ResponseEntity<?> list(
            Authentication auth,
            @RequestParam(required = false) String parentFolderId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                folderService.list(auth.getName(), parentFolderId)
        ));
    }

    @PostMapping
    public ResponseEntity<?> create(
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                folderService.create(
                        auth.getName(),
                        body.get("name"),
                        body.get("parentFolderId")
                ),
                "Tạo folder thành công"
        ));
    }

    @PutMapping("/{folderId}")
    public ResponseEntity<?> rename(
            Authentication auth,
            @PathVariable String folderId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                folderService.rename(auth.getName(), folderId, body.get("name")),
                "Đổi tên folder thành công"
        ));
    }

    @DeleteMapping("/{folderId}")
    public ResponseEntity<?> delete(
            Authentication auth,
            @PathVariable String folderId
    ) {
        folderService.delete(auth.getName(), folderId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá folder"));
    }

    @PostMapping("/move-item/{itemId}")
    public ResponseEntity<?> moveItem(
            Authentication auth,
            @PathVariable String itemId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                folderService.moveItem(auth.getName(), itemId, body.get("targetFolderId")),
                "Đã chuyển mục"
        ));
    }

    @PostMapping("/move-folder/{folderId}")
    public ResponseEntity<?> moveFolder(
            Authentication auth,
            @PathVariable String folderId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                folderService.moveFolder(auth.getName(), folderId, body.get("targetFolderId")),
                "Đã chuyển folder"
        ));
    }
}