package com.studymate.repository;

import com.studymate.model.StudyDriveFolder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StudyDriveFolderRepository extends MongoRepository<StudyDriveFolder, String> {

    List<StudyDriveFolder> findByUserIdAndParentFolderIdOrderByUpdatedAtDesc(String userId, String parentFolderId);

    List<StudyDriveFolder> findByUserIdAndParentFolderIdIsNullOrderByUpdatedAtDesc(String userId);

    Optional<StudyDriveFolder> findByIdAndUserId(String id, String userId);

    boolean existsByUserIdAndParentFolderIdAndNameIgnoreCase(String userId, String parentFolderId, String name);

    boolean existsByUserIdAndParentFolderIdIsNullAndNameIgnoreCase(String userId, String name);
}