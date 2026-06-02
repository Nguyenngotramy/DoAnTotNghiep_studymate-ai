package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String userEmail;
    private String userFullName;

    private PaymentProvider provider; // MOMO, VNPAY

    private PaymentStatus status;

    private long amountVnd;

    private String orderId; // Unique order ID for payment gateway

    private String transactionId; // Transaction ID from payment gateway

    private String payUrl; // Payment URL from MoMo/VNPay

    private String signature; // Signature for verification

    private String callbackData; // Raw callback data for debugging

    @CreatedDate
    private Instant createdAt;

    private Instant paidAt;

    private Instant expiresAt;

    public enum PaymentProvider {
        MOMO,
        VNPAY
    }

    public enum PaymentStatus {
        PENDING,
        SUCCESS,
        FAILED,
        EXPIRED
    }
}
