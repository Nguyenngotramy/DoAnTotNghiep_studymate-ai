package com.studymate.repository.study;

import com.studymate.model.study.StudySubjectRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StudySubjectRecordRepository extends MongoRepository<StudySubjectRecord, String> {
    List<StudySubjectRecord> findByTermIdAndUserIdOrderByCreatedAtAsc(String termId, String userId);
    void deleteByTermIdAndUserId(String termId, String userId);
}