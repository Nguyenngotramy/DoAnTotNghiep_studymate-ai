package com.studymate.repository;

import com.studymate.model.PostReport;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PostReportRepository extends MongoRepository<PostReport, String> {
    List<PostReport> findByPostId(String postId);
    List<PostReport> findByStatus(String status);
    List<PostReport> findByStatusOrderByCreatedAtDesc(String status);
    long countByPostIdAndStatus(String postId, String status);
    long countByStatus(String status);
    boolean existsByPostIdAndReporterIdAndReasonType(String postId, String reporterId, String reasonType);
}
