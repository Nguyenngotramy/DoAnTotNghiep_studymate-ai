package com.studymate.repository;
import com.studymate.model.PredictRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.*;
public interface PredictRecordRepository extends MongoRepository<PredictRecord, String> {
    List<PredictRecord> findByUserIdOrderByCreatedAtDesc(String userId);
    long countByUserId(String userId);
}
