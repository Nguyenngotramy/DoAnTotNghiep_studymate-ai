package com.studymate.repository;

import com.studymate.model.FlashcardDeck;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface FlashcardDeckRepository extends MongoRepository<FlashcardDeck, String> {
    List<FlashcardDeck> findByCreatedByIdOrderByUpdatedAtDesc(String createdById);
    Optional<FlashcardDeck> findByIdAndCreatedById(String id, String createdById);
}