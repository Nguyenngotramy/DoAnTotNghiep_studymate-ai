package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "post_shares")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostShare {

    @Id
    private String id;

    private String postId;
    private String senderId;
    private String senderName;
    private String targetType; // "FRIEND" | "GROUP"
    private String targetUserId;
    private String targetGroupId;
    private String message;

    @CreatedDate
    private Instant createdAt;
}
