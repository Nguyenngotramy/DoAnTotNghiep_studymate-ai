package com.studymate.repository;

import com.studymate.model.Friendship;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends MongoRepository<Friendship, String> {

    @Query("{ '$or': [ { 'requesterId': ?0, 'receiverId': ?1 }, { 'requesterId': ?1, 'receiverId': ?0 } ] }")
    Optional<Friendship> findBetween(String u1, String u2);

    @Query("{ '$or': [ { 'requesterId': ?0 }, { 'receiverId': ?0 } ], 'status': 'ACCEPTED' }")
    List<Friendship> findFriends(String userId);

    List<Friendship> findByReceiverIdAndStatus(String receiverId, Friendship.Status status);

    List<Friendship> findByRequesterIdAndStatus(String requesterId, Friendship.Status status);

    List<Friendship> findByRequesterIdOrReceiverId(String requesterId, String receiverId);
}