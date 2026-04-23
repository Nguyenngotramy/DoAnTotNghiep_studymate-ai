package com.studymate.repository;

import com.studymate.model.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    Page<ChatMessage> findByGroupIdOrderByCreatedAtDesc(String groupId, Pageable pageable);

    List<ChatMessage> findByGroupIdAndPinnedTrueOrderByCreatedAtDesc(String groupId);
}