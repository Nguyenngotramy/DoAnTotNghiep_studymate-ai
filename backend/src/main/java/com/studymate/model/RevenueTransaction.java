package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "revenue_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueTransaction {

    @Id
    private String id;

    /** Reference to the payment request */
    private String paymentRequestId;

    /** User who made the payment */
    private String userId;
    private String userEmail;
    private String userFullName;

    /** Revenue source: MEMBERSHIP, ADVERTISEMENT */
    private RevenueSource source;

    /** Membership tier if source is MEMBERSHIP */
    private com.studymate.model.User.MembershipTier tier;

    /** Membership period if source is MEMBERSHIP */
    private MembershipPeriod period;

    /** Amount in VND */
    private long amountVnd;

    /** Tax rate percentage */
    private double taxRate;

    /** Tax amount */
    private long taxAmount;

    /** Net revenue after tax */
    private long netRevenue;

    /** Transaction date */
    @CreatedDate
    private Instant createdAt;

    public enum RevenueSource {
        MEMBERSHIP,
        ADVERTISEMENT
    }
}
