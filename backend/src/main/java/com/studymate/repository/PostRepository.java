package com.studymate.repository;

import com.studymate.model.Post;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface PostRepository extends MongoRepository<Post, String> {
    Page<Post> findByPublishedTrue(Pageable pageable);

    Page<Post> findByPublishedTrueAndTagsContainingIgnoreCase(String tag, Pageable pageable);

    List<Post> findByAuthorIdOrderByCreatedAtDesc(String authorId);

    @Query("{ 'published': true }")
    Page<Post> findByPublishedTrueOrderByCreatedAtDesc(Pageable pageable);

    @Query("{ 'published': true, 'savedBy': ?0 }")
    Page<Post> findSavedPostsByUserId(String userId, Pageable pageable);

    @Query("{ '_id': ?0, 'authorId': ?1 }")
    Post findByIdAndAuthorId(String id, String authorId);
}