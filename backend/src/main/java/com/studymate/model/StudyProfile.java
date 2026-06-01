package com.studymate.model.study;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "study_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyProfile {

    @Id
    private String id;

    private String userId;
    private String userType; // HIGHSCHOOL | STUDENT | OTHER

    private String fullName;
    private String schoolName;

    private String className;
    private String gradeLevel; // 10 | 11 | 12

    private String faculty;
    private String major;
    private String specialization;
    private String courseYear;

    private String customProgramName;
    private String targetGoal;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}