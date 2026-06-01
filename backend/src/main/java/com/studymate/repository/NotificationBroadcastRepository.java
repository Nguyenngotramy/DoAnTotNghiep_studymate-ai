package com.studymate.repository;

import com.studymate.model.NotificationBroadcast;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationBroadcastRepository extends MongoRepository<NotificationBroadcast, String> {

    List<NotificationBroadcast> findTop50ByOrderByCreatedAtDesc();
}
