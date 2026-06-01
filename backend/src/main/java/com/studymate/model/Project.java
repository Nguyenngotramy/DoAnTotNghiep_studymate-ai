package com.studymate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "projects")
public class Project {
    @Id
    private String id;

    private String groupId;
    private String name;
    private String description;
    private String createdBy; // userId

    private ProjectStatus status;
    private Instant startDate;
    private Instant endDate;
    private Instant completedAt;

    private List<String> memberIds; // List of user IDs participating in the project

    private Instant createdAt;
    private Instant updatedAt;

    public enum ProjectStatus {
        PLANNING,
        ACTIVE,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }
}
