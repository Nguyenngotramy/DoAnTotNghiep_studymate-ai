package com.studymate.repository;

import com.studymate.model.StudyDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StudyDocumentRepository extends MongoRepository<StudyDocument, String> {
    List<StudyDocument> findByGroupIdOrderByCreatedAtDesc(String groupId);
    Optional<StudyDocument> findByIdAndGroupId(String id, String groupId);
}