package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "study_drive_folders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyDriveFolder {

    @Id
    private String id;

    private String userId;
    private String name;

    /**
     * null = folder gốc
     * có giá trị = folder con của folder khác
     */
    private String parentFolderId;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}