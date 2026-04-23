package com.studymate.repository;

import com.studymate.model.Group;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends MongoRepository<Group, String> {

    Optional<Group> findByInviteCode(String inviteCode);

    @Query("{ 'members.userId': ?0 }")
    List<Group> findByMemberId(String userId);

    boolean existsByInviteCode(String code);

    List<Group> findByPublicVisibleTrueOrderByCreatedAtDesc();
}