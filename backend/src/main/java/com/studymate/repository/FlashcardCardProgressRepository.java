package com.studymate.repository;

import com.studymate.model.FlashcardCardProgress;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface FlashcardCardProgressRepository extends MongoRepository<FlashcardCardProgress, String> {

    List<FlashcardCardProgress> findByUserIdAndDeckId(String userId, String deckId);

    Optional<FlashcardCardProgress> findByUserIdAndDeckIdAndCardId(String userId, String deckId, String cardId);

    void deleteByUserIdAndDeckId(String userId, String deckId);
}
