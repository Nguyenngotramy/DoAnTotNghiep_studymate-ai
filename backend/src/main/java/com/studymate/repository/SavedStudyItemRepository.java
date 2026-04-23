package com.studymate.repository;

import com.studymate.model.SavedStudyItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SavedStudyItemRepository extends MongoRepository<SavedStudyItem, String> {
    List<SavedStudyItem> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<SavedStudyItem> findByUserIdAndSourceId(String userId, String sourceId);
    Optional<SavedStudyItem> findByIdAndUserId(String id, String userId);

    List<SavedStudyItem> findByUserIdAndFolderIdOrderByCreatedAtDesc(String userId, String folderId);

    List<SavedStudyItem> findByUserIdAndFolderIdIsNullOrderByCreatedAtDesc(String userId);
}