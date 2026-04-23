package com.studymate.model;
import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant; import java.util.*;
@Document(collection = "predict_records") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PredictRecord {
    @Id private String id;
    private String userId, mode, targetGrade, predictedGrade, advice;
    private Map<String, Double> scores;
    private double gpa, probability;
    private List<PlanItem> studyPlan;
    @CreatedDate private Instant createdAt;
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PlanItem {
        private String subject;
        private double currentScore, gap, hoursPerWeek;
        private String status;
    }
}
