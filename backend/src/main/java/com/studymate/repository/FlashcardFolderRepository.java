package com.studymate.repository;

import com.studymate.model.FlashcardFolder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface FlashcardFolderRepository extends MongoRepository<FlashcardFolder, String> {
    List<FlashcardFolder> findByCreatedByIdOrderByCreatedAtDesc(String createdById);
    Optional<FlashcardFolder> findByIdAndCreatedById(String id, String createdById);
}