package com.studymate.repository;

import com.studymate.model.MembershipPayment;
import com.studymate.model.MembershipPayment.PaymentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MembershipPaymentRepository extends MongoRepository<MembershipPayment, String> {

    List<MembershipPayment> findByUserIdOrderByCreatedAtDesc(String userId);

    List<MembershipPayment> findByStatusOrderByCreatedAtDesc(PaymentStatus status);

    List<MembershipPayment> findByStatusAndCreatedAtAfterOrderByCreatedAtDesc(PaymentStatus status, Instant after);

    long countByStatus(PaymentStatus status);

    Optional<MembershipPayment> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, PaymentStatus status);

    List<MembershipPayment> findByUserIdAndTierAndPeriodAndStatus(String userId, String tier, String period, PaymentStatus status);
}
