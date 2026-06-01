package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "membership_payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipPayment {

    @Id
    private String id;

    private String userId;
    private String userEmail;
    private String userFullName;

    private MembershipTier tier;
    private MembershipPeriod period;

    private long amountVnd;

    /** Mã chuyển khoản gợi ý: SM-{orderId} */
    private String transferCode;

    private String userNote;

    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    private String adminNote;
    private String reviewedByAdminId;

    @CreatedDate
    private Instant createdAt;

    private Instant reviewedAt;

    /** Thời điểm hết hạn sau khi admin duyệt */
    private Instant grantedExpiresAt;

    /** Thời điểm hết hạn yêu cầu thanh toán (30 phút) */
    private Instant expiresAt;

    /** ID admin đã duyệt */
    private String approvedByAdminId;

    /** ID admin đã từ chối */
    private String rejectedByAdminId;

    /** Lý do từ chối */
    private String rejectReason;

    /** Ngày duyệt */
    private Instant approvedAt;

    /** Ngày từ chối */
    private Instant rejectedAt;

    public enum PaymentStatus {
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED,
        CANCELLED
    }
}
