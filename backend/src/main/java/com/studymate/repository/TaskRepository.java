package com.studymate.repository;

import com.studymate.model.Task;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends MongoRepository<Task, String> {

    List<Task> findByGroupIdOrderByCreatedAtDesc(String groupId);

    List<Task> findByGroupIdAndStatus(String groupId, Task.Status status);

    List<Task> findByGroupIdAndStatus(String groupId, Task.Status status, Pageable pageable);

    List<Task> findByAssigneeId(String assigneeId);

    Optional<Task> findByIdAndGroupId(String id, String groupId);

    long countByGroupId(String groupId);

    long countByGroupIdAndStatus(String groupId, Task.Status status);

    // task cá nhân
    List<Task> findByPersonalTrueAndCreatedByIdOrderByCreatedAtDesc(String createdById);

    List<Task> findByPersonalTrueAndAssigneeIdOrderByCreatedAtDesc(String assigneeId);

    Optional<Task> findByIdAndPersonalTrue(String id);

    // task nhóm được giao cho user
    List<Task> findByGroupIdInAndAssigneeIdOrderByCreatedAtDesc(Collection<String> groupIds, String assigneeId);

    List<Task> findByGroupIdAndAssigneeIdOrderByCreatedAtDesc(String groupId, String assigneeId);

    // task nhóm do user tạo
    List<Task> findByGroupIdInAndCreatedByIdOrderByCreatedAtDesc(Collection<String> groupIds, String createdById);

    List<Task> findByGroupIdAndCreatedByIdOrderByCreatedAtDesc(String groupId, String createdById);

    // progress / thống kê user
    List<Task> findByCreatedByIdOrderByCreatedAtDesc(String createdById);

    List<Task> findByAssigneeIdOrderByCreatedAtDesc(String assigneeId);

    // Project-based queries
    List<Task> findByGroupIdAndProjectIdOrderByCreatedAtDesc(String groupId, String projectId);

    List<Task> findByProjectIdOrderByCreatedAtDesc(String projectId);

    long countByProjectId(String projectId);

    long countByProjectIdAndStatus(String projectId, Task.Status status);

    @Query("{'projectId': ?0, 'status': {$ne: 'DONE'}, 'deadline': {$lt: ?1}}")
    Long countOverdueByProjectId(String projectId, Instant now);

    List<Task> findByProjectIdAndAssigneeIdOrderByCreatedAtDesc(String projectId, String assigneeId);

    Optional<Task> findByIdAndProjectId(String id, String projectId);
}
