package com.studymate.dto.request;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PostRequest {
    @NotBlank(message = "Tiêu đề không được trống")
    private String title;

    @NotBlank(message = "Nội dung không được trống")
    private String content;

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    private String videoUrl;
    private String coverImage;
    private String summary;
}
