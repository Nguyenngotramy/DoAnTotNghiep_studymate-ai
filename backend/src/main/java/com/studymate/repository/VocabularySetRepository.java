package com.studymate.repository;

import com.studymate.model.VocabularySet;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface VocabularySetRepository extends MongoRepository<VocabularySet, String> {
    List<VocabularySet> findByCreatedByIdOrderByUpdatedAtDesc(String createdById);
    Optional<VocabularySet> findByIdAndCreatedById(String id, String createdById);
}
