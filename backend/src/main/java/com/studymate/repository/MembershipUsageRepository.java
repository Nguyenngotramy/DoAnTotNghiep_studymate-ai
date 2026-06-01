package com.studymate.repository;

import com.studymate.model.MembershipUsage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface MembershipUsageRepository extends MongoRepository<MembershipUsage, String> {

    Optional<MembershipUsage> findByUserIdAndMonthKey(String userId, String monthKey);
}
