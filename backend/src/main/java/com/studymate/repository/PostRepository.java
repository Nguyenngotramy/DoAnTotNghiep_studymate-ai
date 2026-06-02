package com.studymate.repository;

import com.studymate.model.Post;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface PostRepository extends MongoRepository<Post, String> {

    @Query("{ 'published': true, '$or': [ { 'moderationStatus': 'APPROVED' }, { 'moderationStatus': null } ] }")
    Page<Post> findActivePosts(Pageable pageable);

    Page<Post> findByPublishedTrue(Pageable pageable);

    Page<Post> findByPublishedTrueAndTagsContainingIgnoreCase(String tag, Pageable pageable);

    @Query("{ 'published': true }")
    Page<Post> findByPublishedTrueOrderByCreatedAtDesc(Pageable pageable);

    @Query("{ 'published': true, '$or': [ { 'moderationStatus': 'APPROVED' }, { 'moderationStatus': null } ], 'tags': { '$regex': ?0, '$options': 'i' } }")
    Page<Post> findActivePostsByTag(String tag, Pageable pageable);

    List<Post> findByAuthorIdOrderByCreatedAtDesc(String authorId);

    @Query("{ 'published': true, '$or': [ { 'moderationStatus': 'APPROVED' }, { 'moderationStatus': null } ], 'savedBy': ?0 }")
    Page<Post> findSavedPostsByUserId(String userId, Pageable pageable);

    @Query("{ '_id': ?0, 'authorId': ?1 }")
    Post findByIdAndAuthorId(String id, String authorId);

    // Admin & Moderation Queries
    Page<Post> findByModerationStatus(String moderationStatus, Pageable pageable);

    List<Post> findByModerationStatus(String moderationStatus);

    @Query("{ 'authorId': ?0, 'moderationStatus': 'NEEDS_REVISION' }")
    List<Post> findRevisionPostsByAuthor(String authorId);

    /** Admin moderation — narrow DB queries instead of findAll(). */
    @Query("{ 'moderationStatus': 'PENDING_REVIEW', 'published': false }")
    List<Post> findPendingReviewCandidates();

    @Query("{ '$and': [ "
            + "{ 'moderationStatus': { $ne: 'REMOVED' } }, "
            + "{ '$or': [ { 'reviewedAt': null }, { 'reviewedAt': { '$exists': false } } ] }, "
            + "{ '$or': [ "
            + "{ 'mediaSafetyStatus': { $in: ['WARNING', 'VIOLATION', 'UNKNOWN'] } }, "
            + "{ 'moderationStatus': 'REJECTED' }, "
            + "{ 'moderationStatus': 'NEEDS_REVISION' }, "
            + "{ 'authorRevisionRequired': true }, "
            + "{ 'aiSafetyStatus': { $in: ['WARNING', 'VIOLATION'] } }, "
            + "{ 'flaggedImageUrls.0': { $exists: true } } "
            + "] } "
            + "] }")
    List<Post> findFlaggedCandidates();

    @Query("{ 'reviewedAt': { $exists: true, $ne: null }, "
            + "'moderationStatus': { $in: ['REJECTED', 'REMOVED'] } }")
    List<Post> findProcessedCandidates();

    @Query("{ $or: [ "
            + "{ 'imageUrls.0': { $exists: true } }, "
            + "{ 'videoUrl': { $exists: true, $ne: null, $ne: '' } } "
            + "], 'published': true, 'moderationStatus': 'APPROVED' }")
    List<Post> findApprovedPublishedWithMedia();

    @Query("{ 'published': true, '$or': [ { 'moderationStatus': null }, { 'moderationStatus': '' } ] }")
    List<Post> findLegacyPublishedWithoutStatus();
}