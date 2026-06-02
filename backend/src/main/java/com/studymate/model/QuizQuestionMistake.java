package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "quiz_question_mistakes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndex(name = "user_quiz_question", def = "{'userId': 1, 'quizId': 1, 'questionId': 1}", unique = true)
public class QuizQuestionMistake {

    @Id
    private String id;

    private String userId;
    private String quizId;
    private String questionId;

    @Builder.Default
    private int wrongCount = 0;

    @Builder.Default
    private int correctCount = 0;

    private Instant lastWrongAt;

    @LastModifiedDate
    private Instant updatedAt;
}
