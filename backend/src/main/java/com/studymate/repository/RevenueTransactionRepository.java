package com.studymate.repository;

import com.studymate.model.RevenueTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface RevenueTransactionRepository extends MongoRepository<RevenueTransaction, String> {

    List<RevenueTransaction> findBySourceOrderByCreatedAtDesc(RevenueTransaction.RevenueSource source);

    List<RevenueTransaction> findByCreatedAtAfterOrderByCreatedAtDesc(Instant after);

    List<RevenueTransaction> findBySourceAndCreatedAtAfterOrderByCreatedAtDesc(
            RevenueTransaction.RevenueSource source,
            Instant after
    );
}
