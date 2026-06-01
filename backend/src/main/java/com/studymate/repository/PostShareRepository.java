package com.studymate.repository;

import com.studymate.model.PostShare;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PostShareRepository extends MongoRepository<PostShare, String> {
    List<PostShare> findByPostId(String postId);
    List<PostShare> findBySenderId(String senderId);
}
