package com.studymate.repository;

import com.studymate.model.QuizSet;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface QuizSetRepository extends MongoRepository<QuizSet, String> {
    List<QuizSet> findByCreatedByIdOrderByUpdatedAtDesc(String createdById);
    Optional<QuizSet> findByIdAndCreatedById(String id, String createdById);
}