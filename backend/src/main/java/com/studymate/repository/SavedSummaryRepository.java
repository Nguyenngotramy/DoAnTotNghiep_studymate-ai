package com.studymate.repository;

import com.studymate.model.SavedSummary;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SavedSummaryRepository extends MongoRepository<SavedSummary, String> {
    List<SavedSummary> findByCreatedByIdOrderByUpdatedAtDesc(String createdById);
    Optional<SavedSummary> findByIdAndCreatedById(String id, String createdById);
}
