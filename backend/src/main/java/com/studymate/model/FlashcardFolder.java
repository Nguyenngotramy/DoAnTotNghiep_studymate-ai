package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "flashcard_folders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardFolder {

    @Id
    private String id;

    private String name;
    private String color;

    private String createdById;
    private String createdByName;

    @CreatedDate
    private Instant createdAt;
}