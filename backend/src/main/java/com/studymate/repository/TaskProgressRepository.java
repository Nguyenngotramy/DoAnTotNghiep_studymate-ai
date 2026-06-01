package com.studymate.repository;

import com.studymate.model.TaskProgress;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskProgressRepository extends MongoRepository<TaskProgress, String> {
    List<TaskProgress> findByProjectId(String projectId);
    List<TaskProgress> findByProjectIdAndUserId(String projectId, String userId);
    long countByProjectId(String projectId);
    long countByProjectIdAndUserId(String projectId, String userId);
}
