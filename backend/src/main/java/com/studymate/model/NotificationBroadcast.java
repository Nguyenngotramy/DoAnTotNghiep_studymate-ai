package com.studymate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "notification_broadcasts")
public class NotificationBroadcast {

    @Id
    private String id;

    private String title;
    private String message;

    private String type;
    private String priority;
    private String targetType;

    @Builder.Default
    private List<String> recipientIds = new ArrayList<>();

    private int recipientCount;

    private String createdBy;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
