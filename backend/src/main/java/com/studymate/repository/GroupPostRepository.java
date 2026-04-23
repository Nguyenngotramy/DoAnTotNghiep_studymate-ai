package com.studymate.repository;

import com.studymate.model.GroupPost;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GroupPostRepository extends MongoRepository<GroupPost, String> {

    List<GroupPost> findByGroupIdOrderByCreatedAtDesc(String groupId);

    List<GroupPost> findByGroupIdAndStatusOrderByCreatedAtDesc(String groupId, GroupPost.PostStatus status);

    List<GroupPost> findByGroupIdAndReportsIsNotNullOrderByCreatedAtDesc(String groupId);
}