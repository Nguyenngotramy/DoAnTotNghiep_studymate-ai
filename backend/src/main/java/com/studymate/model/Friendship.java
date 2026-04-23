package com.studymate.model;
import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
@Document(collection = "friendships") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Friendship {
    @Id private String id;
    private String requesterId, receiverId;
    @Builder.Default private Status status = Status.PENDING;
    @CreatedDate private Instant createdAt;
    public enum Status { PENDING, ACCEPTED, BLOCKED }
}
