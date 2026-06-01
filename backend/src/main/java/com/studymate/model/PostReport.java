package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "post_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostReport {

    @Id
    private String id;

    private String postId;
    private String reporterId;
    private String reporterName;
    private String reasonType; // "SAI_TAG" | "NOI_DUNG_KHONG_PHU_HOP" | "SPAM" | "QUAY_ROI" | "VI_PHAM_TIEU_CHUAN" | "KHAC"
    private String reasonText;
    
    @Builder.Default
    private String status = "OPEN"; // "OPEN" | "REVIEWED" | "DISMISSED"
    
    @CreatedDate
    private Instant createdAt;
    
    private Instant reviewedAt;
    private String reviewedByAdminId;
    private String reviewNote;
}
