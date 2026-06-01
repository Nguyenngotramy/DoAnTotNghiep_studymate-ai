package com.studymate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "task_progress")
public class TaskProgress {
    @Id
    private String id;

    private String projectId;
    private String taskId;
    private String userId; // member who completed the task

    @CreatedDate
    private Instant completedAt;
}
