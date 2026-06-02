package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "user_warnings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserWarning {

    @Id
    private String id;

    private String userId;
    private String postId;
    private String level; // "REMINDER" | "WARNING" | "SEVERE"
    private String reason;
    private String message;
    private String createdByAdminId;
    
    @CreatedDate
    private Instant createdAt;
    
    @Builder.Default
    private boolean acknowledged = false;
}
