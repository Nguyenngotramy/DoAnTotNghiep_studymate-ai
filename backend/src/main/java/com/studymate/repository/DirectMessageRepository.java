package com.studymate.repository;

import com.studymate.model.DirectMessage;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DirectMessageRepository extends MongoRepository<DirectMessage, String> {

    @Query("{ '$or': [ { 'senderId': ?0, 'receiverId': ?1 }, { 'senderId': ?1, 'receiverId': ?0 } ] }")
    Page<DirectMessage> findConversation(String u1, String u2, Pageable pageable);

    @Query("{ '$or': [ { 'senderId': ?0 }, { 'receiverId': ?0 } ] }")
    Page<DirectMessage> findAllByUser(String userId, Pageable pageable);

    @Query("{ '$or': [ { 'senderId': ?0 }, { 'receiverId': ?0 } ] }")
    List<DirectMessage> findLatestConversations(String userId);

    @Query("{ '$or': [ { 'senderId': ?0, 'receiverId': ?1, 'pinned': true }, { 'senderId': ?1, 'receiverId': ?0, 'pinned': true } ] }")
    List<DirectMessage> findPinnedConversation(String u1, String u2, Sort sort);

    @Query("{ '$or': [ { 'senderId': ?0, 'receiverId': ?1 }, { 'senderId': ?1, 'receiverId': ?0 } ] }")
    List<DirectMessage> findConversationList(String u1, String u2, Sort sort);

    Optional<DirectMessage> findById(String id);

    long countBySenderIdAndReceiverIdAndReadAtIsNull(String senderId, String receiverId);
}