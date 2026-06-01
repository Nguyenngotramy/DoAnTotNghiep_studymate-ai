package com.studymate.repository;

import com.studymate.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByGroupId(String groupId);
    List<Project> findByGroupIdOrderByCreatedAtDesc(String groupId);
    Optional<Project> findByGroupIdAndStatus(String groupId, Project.ProjectStatus status);
    List<Project> findByGroupIdAndStatusOrderByCreatedAtDesc(String groupId, Project.ProjectStatus status);
    Optional<Project> findByIdAndGroupId(String projectId, String groupId);
}
