package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.dto.request.TaskRequest;
import com.studymate.model.Group;
import com.studymate.model.Task;
import com.studymate.repository.UserRepository;
import com.studymate.service.GroupService;
import com.studymate.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepo;
    private final GroupService groupService;

    // =========================
    // TASK TRONG NHÓM
    // =========================

    @GetMapping("/groups/{groupId}/tasks")
    public ResponseEntity<?> list(@PathVariable String groupId) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getByGroup(groupId)));
    }

    @GetMapping("/groups/{groupId}/tasks/{taskId}")
    public ResponseEntity<?> getOne(@PathVariable String groupId, @PathVariable String taskId) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getOne(groupId, taskId)));
    }

    @PostMapping("/groups/{groupId}/tasks")
    public ResponseEntity<?> create(
            @PathVariable String groupId,
            Authentication auth,
            @Valid @RequestBody TaskRequest req
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        taskService.create(groupId, auth.getName(), req),
                        "Tạo task thành công!"
                )
        );
    }

    @PutMapping("/groups/{groupId}/tasks/{taskId}")
    public ResponseEntity<?> update(
            @PathVariable String groupId,
            @PathVariable String taskId,
            Authentication auth,
            @Valid @RequestBody TaskRequest req
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(taskService.update(groupId, taskId, auth.getName(), req))
        );
    }

    @PatchMapping("/groups/{groupId}/tasks/{taskId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable String groupId,
            @PathVariable String taskId,
            @RequestBody Map<String, String> body
    ) {
        String rawStatus = body.get("status");
        if (rawStatus == null || rawStatus.isBlank()) {
            throw new RuntimeException("Thiếu trạng thái task");
        }

        Task.Status status = Task.Status.valueOf(rawStatus.trim().toUpperCase());
        return ResponseEntity.ok(ApiResponse.ok(taskService.updateStatus(groupId, taskId, status)));
    }

    @DeleteMapping("/groups/{groupId}/tasks/{taskId}")
    public ResponseEntity<?> delete(@PathVariable String groupId, @PathVariable String taskId) {
        taskService.delete(groupId, taskId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá task"));
    }

    // =========================
    // TASK CÁ NHÂN NGOÀI NHÓM
    // =========================

    @GetMapping("/tasks/personal")
    public ResponseEntity<?> listPersonal(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getPersonalTasks(auth.getName())));
    }

    @GetMapping("/tasks/personal/{taskId}")
    public ResponseEntity<?> getPersonal(@PathVariable String taskId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getOnePersonal(taskId, auth.getName())));
    }

    @PostMapping("/tasks/personal")
    public ResponseEntity<?> createPersonal(
            Authentication auth,
            @Valid @RequestBody TaskRequest req
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        taskService.createPersonal(auth.getName(), req),
                        "Tạo task cá nhân thành công!"
                )
        );
    }

    @PutMapping("/tasks/personal/{taskId}")
    public ResponseEntity<?> updatePersonal(
            @PathVariable String taskId,
            Authentication auth,
            @Valid @RequestBody TaskRequest req
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(taskService.updatePersonal(taskId, auth.getName(), req))
        );
    }

    @PatchMapping("/tasks/personal/{taskId}/status")
    public ResponseEntity<?> updatePersonalStatus(
            @PathVariable String taskId,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        String rawStatus = body.get("status");
        if (rawStatus == null || rawStatus.isBlank()) {
            throw new RuntimeException("Thiếu trạng thái task");
        }

        Task.Status status = Task.Status.valueOf(rawStatus.trim().toUpperCase());
        return ResponseEntity.ok(ApiResponse.ok(taskService.updatePersonalStatus(taskId, auth.getName(), status)));
    }

    @DeleteMapping("/tasks/personal/{taskId}")
    public ResponseEntity<?> deletePersonal(@PathVariable String taskId, Authentication auth) {
        taskService.deletePersonal(taskId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá task cá nhân"));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/tasks/personal/{taskId}/submit")
    public ResponseEntity<?> submitPersonal(
            @PathVariable String taskId,
            Authentication auth,
            @RequestBody Map<String, Object> body
    ) {
        var user = userRepo.findById(auth.getName()).orElseThrow();

        String answerText = body.get("answerText") == null ? null : String.valueOf(body.get("answerText"));

        List<Map<String, Object>> files =
                body.get("files") instanceof List<?> ? (List<Map<String, Object>>) body.get("files") : Collections.emptyList();

        List<Map<String, Object>> images =
                body.get("images") instanceof List<?> ? (List<Map<String, Object>>) body.get("images") : Collections.emptyList();

        return ResponseEntity.ok(
                ApiResponse.ok(
                        taskService.submitPersonal(
                                taskId,
                                auth.getName(),
                                user.getFullName(),
                                answerText,
                                files,
                                images
                        ),
                        "Nộp bài thành công"
                )
        );
    }

    @DeleteMapping("/tasks/personal/{taskId}/submit")
    public ResponseEntity<?> clearPersonalSubmission(
            @PathVariable String taskId,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(taskService.clearPersonalSubmission(taskId, auth.getName()), "Đã thu hồi bài nộp")
        );
    }

    // =========================
    // TRANG "NHIỆM VỤ CỦA TÔI"
    // =========================

    @GetMapping("/tasks/my")
    public ResponseEntity<?> getMyTasks(
            Authentication auth,
            @RequestParam(defaultValue = "ALL") String mode,
            @RequestParam(required = false) String groupId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                taskService.getMyTasks(auth.getName(), mode, groupId)
        ));
    }

    @GetMapping("/tasks/my/groups")
    public ResponseEntity<?> getMyTaskGroups(Authentication auth) {
        List<Group> groups = groupService.getMyGroups(auth.getName());
        List<Map<String, Object>> data = groups.stream()
                .map(g -> Map.<String, Object>of(
                        "id", g.getId(),
                        "name", g.getName(),
                        "subject", g.getSubject() == null ? "" : g.getSubject(),
                        "coverColor", g.getCoverColor() == null ? "#6366f1" : g.getCoverColor()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/tasks/my/progress")
    public ResponseEntity<?> getMyTaskProgress(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                taskService.getMyTaskProgress(auth.getName())
        ));
    }

    // =========================
    // COMMENTS
    // =========================

    @PostMapping("/groups/{groupId}/tasks/{taskId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable String groupId,
            @PathVariable String taskId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        var user = userRepo.findById(auth.getName()).orElseThrow();
        String content = body.get("content");
        String parentId = body.get("parentId");

        return ResponseEntity.ok(
                ApiResponse.ok(
                        taskService.addComment(
                                groupId,
                                taskId,
                                auth.getName(),
                                user.getFullName(),
                                content,
                                parentId
                        ),
                        "Thêm bình luận thành công"
                )
        );
    }

    @PutMapping("/groups/{groupId}/tasks/{taskId}/comments/{commentId}")
    public ResponseEntity<?> updateComment(
            @PathVariable String groupId,
            @PathVariable String taskId,
            @PathVariable String commentId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        taskService.updateComment(
                                groupId,
                                taskId,
                                commentId,
                                auth.getName(),
                                body.get("content")
                        ),
                        "Đã cập nhật bình luận"
                )
        );
    }

    @DeleteMapping("/groups/{groupId}/tasks/{taskId}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable String groupId,
            @PathVariable String taskId,
            @PathVariable String commentId,
            Authentication auth
    ) {
        taskService.deleteComment(groupId, taskId, commentId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá bình luận"));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/groups/{groupId}/tasks/{taskId}/submit")
    public ResponseEntity<?> submitWork(
            @PathVariable String groupId,
            @PathVariable String taskId,
            Authentication auth,
            @RequestBody Map<String, Object> body
    ) {
        var user = userRepo.findById(auth.getName()).orElseThrow();

        String answerText = body.get("answerText") == null ? null : String.valueOf(body.get("answerText"));

        List<Map<String, Object>> files =
                body.get("files") instanceof List<?> ? (List<Map<String, Object>>) body.get("files") : Collections.emptyList();

        List<Map<String, Object>> images =
                body.get("images") instanceof List<?> ? (List<Map<String, Object>>) body.get("images") : Collections.emptyList();

        return ResponseEntity.ok(
                ApiResponse.ok(
                        taskService.submitWork(
                                groupId,
                                taskId,
                                auth.getName(),
                                user.getFullName(),
                                answerText,
                                files,
                                images
                        ),
                        "Nộp bài thành công"
                )
        );
    }

    @DeleteMapping("/groups/{groupId}/tasks/{taskId}/submit")
    public ResponseEntity<?> clearSubmission(
            @PathVariable String groupId,
            @PathVariable String taskId
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(taskService.clearSubmission(groupId, taskId), "Đã thu hồi bài nộp")
        );
    }
}