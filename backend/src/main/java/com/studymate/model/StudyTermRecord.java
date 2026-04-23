package com.studymate.model.study;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "study_term_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyTermRecord {

    @Id
    private String id;

    private String userId;
    private String userType; // HIGHSCHOOL | STUDENT | OTHER

    private String academicYear;
    private String semesterType;   // HK1 | HK2 | SUMMER | OTHER
    private String semesterLabel;
    private Boolean isCurrent;

    private String fullName;
    private String schoolName;
    private String className;
    private String gradeLevel;

    private String faculty;
    private String major;
    private String specialization;
    private String courseYear;

    private String customProgramName;
    private String targetGoal;

    private String behaviorRating;
    private String note;

    private Double averageScore;
    private Double gpa10;
    private Double gpa4;
    private String classification;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}