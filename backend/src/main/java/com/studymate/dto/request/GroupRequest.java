package com.studymate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GroupRequest {

    @NotBlank
    @Size(min = 3)
    private String name;

    @NotBlank
    @Size(min = 5)
    private String description;

    @NotBlank
    private String subject;

    private String coverColor = "#6366f1";

    /**
     * true  = hiện mã nhóm
     * false = ẩn mã nhóm
     */
    private boolean publicVisible = true;

    /**
     * true  = cần trưởng nhóm duyệt khi tham gia
     * false = vào nhóm luôn khi nhập đúng mã
     */
    private boolean requireApproval = false;

    /**
     * true  = bài đăng mới phải chờ trưởng nhóm duyệt
     * false = đăng là hiện ngay
     */
    private boolean requirePostApproval = false;
}