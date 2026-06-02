package com.studymate.controller;

import com.studymate.model.Project;
import com.studymate.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/groups/{groupId}/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<?> createProject(
            @PathVariable String groupId,
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        String createdBy = auth.getName();
        String startDateStr = (String) body.get("startDate");
        String endDateStr = (String) body.get("endDate");
        @SuppressWarnings("unchecked")
        List<String> memberIds = (List<String>) body.get("memberIds");

        Project project = projectService.createProject(groupId, name, description, startDateStr, endDateStr, memberIds, createdBy);
        return ResponseEntity.ok(Map.of("success", true, "project", project));
    }

    @GetMapping
    public ResponseEntity<?> getGroupProjects(@PathVariable String groupId) {
        System.out.println("GET /groups/" + groupId + "/projects - Fetching projects");
        try {
            List<Project> projects = projectService.getGroupProjects(groupId);
            System.out.println("Found " + projects.size() + " projects");
            return ResponseEntity.ok(Map.of("success", true, "projects", projects));
        } catch (Exception e) {
            System.out.println("Error fetching projects: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getProject(
            @PathVariable String groupId,
            @PathVariable String projectId
    ) {
        Project project = projectService.getProjectByIdAndGroupId(projectId, groupId);
        return ResponseEntity.ok(Map.of("success", true, "project", project));
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<?> updateProject(
            @PathVariable String groupId,
            @PathVariable String projectId,
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        String startDateStr = (String) body.get("startDate");
        String endDateStr = (String) body.get("endDate");
        String statusStr = (String) body.get("status");
        @SuppressWarnings("unchecked")
        List<String> memberIds = (List<String>) body.get("memberIds");

        Project project = projectService.updateProject(projectId, groupId, name, description, startDateStr, endDateStr, statusStr, memberIds);
        return ResponseEntity.ok(Map.of("success", true, "project", project));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<?> deleteProject(
            @PathVariable String groupId,
            @PathVariable String projectId
    ) {
        projectService.deleteProject(projectId, groupId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/{projectId}/complete")
    public ResponseEntity<?> completeProject(
            @PathVariable String groupId,
            @PathVariable String projectId
    ) {
        Project project = projectService.completeProject(projectId);
        return ResponseEntity.ok(Map.of("success", true, "project", project));
    }

    @PostMapping("/{projectId}/cancel")
    public ResponseEntity<?> cancelProject(
            @PathVariable String groupId,
            @PathVariable String projectId
    ) {
        Project project = projectService.cancelProject(projectId);
        return ResponseEntity.ok(Map.of("success", true, "project", project));
    }

    @GetMapping("/{projectId}/progress")
    public ResponseEntity<?> getProjectProgress(@PathVariable String projectId) {
        try {
            Map<String, Object> progress = projectService.getProjectProgress(projectId);
            return ResponseEntity.ok(Map.of("success", true, "data", progress));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/{projectId}/progress/export")
    public ResponseEntity<byte[]> exportProjectProgress(@PathVariable String projectId) {
        byte[] excelFile = projectService.exportProjectProgress(projectId);
        String filename = "project-progress-" + projectId + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(excelFile);
    }
}
