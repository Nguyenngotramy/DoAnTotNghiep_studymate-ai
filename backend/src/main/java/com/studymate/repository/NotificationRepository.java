package com.studymate.repository;

import com.studymate.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    long countByUserIdAndReadFalse(String userId);

    long countByUserIdAndGroupIdAndReadFalseAndTypeIn(
            String userId,
            String groupId,
            List<String> types
    );

    long countByUserIdAndActorIdAndReadFalseAndTypeIn(
            String userId,
            String actorId,
            List<String> types
    );

    List<Notification> findByUserIdAndGroupIdAndReadFalseAndTypeIn(
            String userId,
            String groupId,
            List<String> types
    );

    List<Notification> findByUserIdAndActorIdAndReadFalseAndTypeIn(
            String userId,
            String actorId,
            List<String> types
    );

    List<Notification> findByUserIdAndReadFalseAndTypeIn(
            String userId,
            List<String> types
    );
}