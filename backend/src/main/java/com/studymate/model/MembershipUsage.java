package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "membership_usage")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipUsage {

    @Id
    private String id;

    private String userId;

    /** Định dạng yyyy-MM */
    private String monthKey;

    @Builder.Default
    private int aiTrendCount = 0;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
