package com.studymate.repository;

import com.studymate.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);

    @Query("{ 'locked': false, 'role': { '$ne': 'ADMIN' }, '_id': { '$ne': ?0 } }")
    List<User> findSuggestions(String currentUserId);
}