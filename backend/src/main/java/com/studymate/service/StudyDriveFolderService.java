package com.studymate.service;

import com.studymate.model.SavedStudyItem;
import com.studymate.model.StudyDriveFolder;
import com.studymate.repository.SavedStudyItemRepository;
import com.studymate.repository.StudyDriveFolderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudyDriveFolderService {

    private final StudyDriveFolderRepository folderRepo;
    private final SavedStudyItemRepository itemRepo;

    public List<StudyDriveFolder> list(String userId, String parentFolderId) {
        if (parentFolderId == null || parentFolderId.isBlank()) {
            return folderRepo.findByUserIdAndParentFolderIdIsNullOrderByUpdatedAtDesc(userId);
        }
        return folderRepo.findByUserIdAndParentFolderIdOrderByUpdatedAtDesc(userId, parentFolderId);
    }

    public StudyDriveFolder create(String userId, String name, String parentFolderId) {
        String cleanName = normalizeName(name);

        if (parentFolderId == null || parentFolderId.isBlank()) {
            if (folderRepo.existsByUserIdAndParentFolderIdIsNullAndNameIgnoreCase(userId, cleanName)) {
                throw new RuntimeException("Folder cùng tên đã tồn tại");
            }
        } else {
            folderRepo.findByIdAndUserId(parentFolderId, userId)
                    .orElseThrow(() -> new RuntimeException("Folder cha không tồn tại"));

            if (folderRepo.existsByUserIdAndParentFolderIdAndNameIgnoreCase(userId, parentFolderId, cleanName)) {
                throw new RuntimeException("Folder cùng tên đã tồn tại");
            }
        }

        StudyDriveFolder folder = StudyDriveFolder.builder()
                .userId(userId)
                .name(cleanName)
                .parentFolderId(isBlank(parentFolderId) ? null : parentFolderId)
                .build();

        return folderRepo.save(folder);
    }

    public StudyDriveFolder rename(String userId, String folderId, String name) {
        StudyDriveFolder folder = folderRepo.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy folder"));

        String cleanName = normalizeName(name);

        if (folder.getParentFolderId() == null) {
            if (!folder.getName().equalsIgnoreCase(cleanName)
                    && folderRepo.existsByUserIdAndParentFolderIdIsNullAndNameIgnoreCase(userId, cleanName)) {
                throw new RuntimeException("Folder cùng tên đã tồn tại");
            }
        } else {
            if (!folder.getName().equalsIgnoreCase(cleanName)
                    && folderRepo.existsByUserIdAndParentFolderIdAndNameIgnoreCase(userId, folder.getParentFolderId(), cleanName)) {
                throw new RuntimeException("Folder cùng tên đã tồn tại");
            }
        }

        folder.setName(cleanName);
        return folderRepo.save(folder);
    }

    public void delete(String userId, String folderId) {
        StudyDriveFolder folder = folderRepo.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy folder"));

        deleteChildren(userId, folderId);
        itemRepo.findByUserIdAndFolderIdOrderByCreatedAtDesc(userId, folderId)
                .forEach(itemRepo::delete);

        folderRepo.delete(folder);
    }

    public SavedStudyItem moveItem(String userId, String itemId, String targetFolderId) {
        SavedStudyItem item = itemRepo.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mục đã lưu"));

        if (!isBlank(targetFolderId)) {
            folderRepo.findByIdAndUserId(targetFolderId, userId)
                    .orElseThrow(() -> new RuntimeException("Folder đích không tồn tại"));
            item.setFolderId(targetFolderId);
        } else {
            item.setFolderId(null);
        }

        return itemRepo.save(item);
    }

    public StudyDriveFolder moveFolder(String userId, String folderId, String targetFolderId) {
        StudyDriveFolder folder = folderRepo.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy folder"));

        if (targetFolderId == null || targetFolderId.isBlank()) {
            folder.setParentFolderId(null);
            return folderRepo.save(folder);
        }

        if (folderId.equals(targetFolderId)) {
            throw new RuntimeException("Không thể chuyển folder vào chính nó");
        }

        StudyDriveFolder target = folderRepo.findByIdAndUserId(targetFolderId, userId)
                .orElseThrow(() -> new RuntimeException("Folder đích không tồn tại"));

        // chặn chuyển vào folder con của chính nó
        String cursor = target.getParentFolderId();
        while (cursor != null) {
            if (cursor.equals(folderId)) {
                throw new RuntimeException("Không thể chuyển folder vào folder con của nó");
            }
            StudyDriveFolder parent = folderRepo.findByIdAndUserId(cursor, userId).orElse(null);
            cursor = parent != null ? parent.getParentFolderId() : null;
        }

        folder.setParentFolderId(targetFolderId);
        return folderRepo.save(folder);
    }

    private void deleteChildren(String userId, String parentFolderId) {
        List<StudyDriveFolder> children = folderRepo.findByUserIdAndParentFolderIdOrderByUpdatedAtDesc(userId, parentFolderId);

        for (StudyDriveFolder child : children) {
            deleteChildren(userId, child.getId());
            itemRepo.findByUserIdAndFolderIdOrderByCreatedAtDesc(userId, child.getId())
                    .forEach(itemRepo::delete);
            folderRepo.delete(child);
        }
    }

    private String normalizeName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new RuntimeException("Tên folder không được để trống");
        }
        return name.trim();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}