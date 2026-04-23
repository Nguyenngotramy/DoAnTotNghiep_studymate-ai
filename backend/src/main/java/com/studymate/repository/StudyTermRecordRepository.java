package com.studymate.repository.study;

import com.studymate.model.study.StudyTermRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StudyTermRecordRepository extends MongoRepository<StudyTermRecord, String> {
    List<StudyTermRecord> findByUserIdOrderByUpdatedAtDesc(String userId);
    Optional<StudyTermRecord> findByIdAndUserId(String id, String userId);
}