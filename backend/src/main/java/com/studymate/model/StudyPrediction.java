package com.studymate.model.study;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyPrediction {

    private Double predictedAverage;
    private String predictedClassification;
    private String confidenceLevel; // low | medium | high

    @Builder.Default
    private List<String> weakSubjects = new ArrayList<>();

    @Builder.Default
    private List<String> strongSubjects = new ArrayList<>();

    @Builder.Default
    private List<String> suggestions = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}