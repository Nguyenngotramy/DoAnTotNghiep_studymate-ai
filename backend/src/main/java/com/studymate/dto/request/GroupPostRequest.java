package com.studymate.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPostRequest {

    @NotBlank(message = "Nội dung bài viết không được trống")
    private String content;

    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    private String videoUrl;

    @Builder.Default
    private List<AttachmentRequest> attachments = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttachmentRequest {
        private String name;
        private String url;
        private String type;
        private long sizeKb;
    }
}