package com.studymate.repository;

import com.studymate.model.QuizQuestionMistake;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface QuizQuestionMistakeRepository extends MongoRepository<QuizQuestionMistake, String> {

    List<QuizQuestionMistake> findByUserIdAndQuizId(String userId, String quizId);

    Optional<QuizQuestionMistake> findByUserIdAndQuizIdAndQuestionId(String userId, String quizId, String questionId);

    List<QuizQuestionMistake> findByUserIdAndQuizIdAndWrongCountGreaterThan(String userId, String quizId, int wrongCount);

    void deleteByUserIdAndQuizId(String userId, String quizId);
}
