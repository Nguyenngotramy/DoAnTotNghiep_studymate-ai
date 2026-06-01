package com.studymate.model.study;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "study_subject_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySubjectRecord {

    @Id
    private String id;

    private String termId;
    private String userId;
    private String userType; // HIGHSCHOOL | STUDENT | OTHER

    private String subjectName;
    private Integer credits;

    @Builder.Default
    private List<Double> regularScores = new ArrayList<>();

    private Double midtermScore;
    private Double finalScore;

    private Double attendanceScore;
    private Double assignmentScore;
    private Double projectScore;

    @Builder.Default
    private List<CustomScore> customScores = new ArrayList<>();

    private Double averageScore;
    private String letterGrade;
    private String status; // pass | fail | in_progress
    private String note;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomScore {
        private String label;
        private Double value;
        private Double weight;
    }
}