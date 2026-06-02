package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "saved_summaries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavedSummary {

    @Id
    private String id;

    private String title;
    private String content;
    private String style;
    private String length;

    private String createdById;
    private String createdByName;

    @Builder.Default
    private boolean aiGenerated = true;

    private String sourceDocumentId;
    private String sourceDocumentName;
    private String sourceGroupId;
    private String sourceGroupName;

    @Builder.Default
    private List<String> relatedBlogTitles = new ArrayList<>();

    private String blogAppendix;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
