package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyDocument {

    @Id
    private String id;

    private String groupId;
    private String name;
    private String fileUrl;
    private String type;
    private String uploaderId;
    private String uploaderName;
    private long sizeKb;

    @Builder.Default
    private SourceType sourceType = SourceType.PAGE;

    private String messageId;

    @CreatedDate
    private Instant createdAt;

    public enum SourceType {
        PAGE, CHAT
    }
}