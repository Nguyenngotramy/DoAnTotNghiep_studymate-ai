package com.studymate.dto.request;

import com.studymate.model.Task;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;

@Data
public class TaskRequest {

    @NotBlank(message = "Tiêu đề task không được để trống")
    private String title;

    private String description;
    private String label;
    private String labelColor;
    private String assigneeId;

    private Task.Status status = Task.Status.TODO;
    private Task.Priority priority = Task.Priority.MEDIUM;

    private Instant deadline;
}