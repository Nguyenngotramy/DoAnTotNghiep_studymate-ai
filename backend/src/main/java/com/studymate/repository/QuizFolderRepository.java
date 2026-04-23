package com.studymate.repository;

import com.studymate.model.QuizFolder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface QuizFolderRepository extends MongoRepository<QuizFolder, String> {
    List<QuizFolder> findByCreatedByIdOrderByCreatedAtDesc(String createdById);
    Optional<QuizFolder> findByIdAndCreatedById(String id, String createdById);
}