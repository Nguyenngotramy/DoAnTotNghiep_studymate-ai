package com.studymate.dto;

import lombok.*;
import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostAiCheckResponse {
    private String detectedSubject;
    @Builder.Default
    private List<String> suggestedTags = new ArrayList<>();
    private boolean tagMatch;
    private double tagConfidence;
    private String safetyStatus;
    private String safetyReason;
    private String message;
}
