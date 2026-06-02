package com.studymate.dto.request;

import lombok.*;
import java.util.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostAiCheckRequest {
    private String title;
    private String content;
    private String subject;
    @Builder.Default
    private List<String> tags = new ArrayList<>();
}
