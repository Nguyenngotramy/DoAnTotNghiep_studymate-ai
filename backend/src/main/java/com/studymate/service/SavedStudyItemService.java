package com.studymate.service;

import com.studymate.model.SavedStudyItem;
import com.studymate.repository.SavedStudyItemRepository;
import com.studymate.repository.StudyDriveFolderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavedStudyItemService {

    private final SavedStudyItemRepository repo;
    private final StudyDriveFolderRepository folderRepo;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    public List<SavedStudyItem> list(String userId, String folderId) {
        if (folderId == null || folderId.isBlank()) {
            return repo.findByUserIdAndFolderIdIsNullOrderByCreatedAtDesc(userId);
        }

        folderRepo.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new RuntimeException("Folder không tồn tại"));

        return repo.findByUserIdAndFolderIdOrderByCreatedAtDesc(userId, folderId);
    }

    public SavedStudyItem savePost(String userId, SavedStudyItem item) {
        repo.findByUserIdAndSourceId(userId, item.getSourceId()).ifPresent(existing -> {
            throw new RuntimeException("Mục này đã được lưu rồi");
        });

        if (item.getFolderId() != null && !item.getFolderId().isBlank()) {
            folderRepo.findByIdAndUserId(item.getFolderId(), userId)
                    .orElseThrow(() -> new RuntimeException("Folder không tồn tại"));
        }

        List<String> copiedImages = new ArrayList<>();
        if (item.getImageUrls() != null) {
            for (String url : item.getImageUrls()) {
                copiedImages.add(copyFileToStudyDrive(userId, url));
            }
        }

        String copiedVideoUrl = copyFileToStudyDrive(userId, item.getVideoUrl());

        List<SavedStudyItem.Attachment> copiedAttachments = new ArrayList<>();
        if (item.getAttachments() != null) {
            for (SavedStudyItem.Attachment a : item.getAttachments()) {
                copiedAttachments.add(
                        SavedStudyItem.Attachment.builder()
                                .name(a.getName())
                                .url(copyFileToStudyDrive(userId, a.getUrl()))
                                .type(a.getType())
                                .sizeKb(a.getSizeKb())
                                .build()
                );
            }
        }

        SavedStudyItem save = SavedStudyItem.builder()
                .userId(userId)
                .sourceId(item.getSourceId())
                .sourceType(item.getSourceType())
                .title(item.getTitle())
                .description(item.getDescription())
                .groupId(item.getGroupId())
                .groupName(item.getGroupName())
                .folderId(item.getFolderId())
                .imageUrls(copiedImages)
                .videoUrl(copiedVideoUrl)
                .attachments(copiedAttachments)
                .build();

        return repo.save(save);
    }

    public SavedStudyItem uploadFile(String userId, String folderId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File không hợp lệ");
        }

        if (folderId != null && !folderId.isBlank()) {
            folderRepo.findByIdAndUserId(folderId, userId)
                    .orElseThrow(() -> new RuntimeException("Folder không tồn tại"));
        }

        try {
            String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
            String ext = "";
            int dot = original.lastIndexOf('.');
            if (dot >= 0) ext = original.substring(dot);

            String savedName = UUID.randomUUID() + ext;
            Path dir = Paths.get(uploadDir, "study-drive", userId);
            Files.createDirectories(dir);

            Files.copy(file.getInputStream(), dir.resolve(savedName), StandardCopyOption.REPLACE_EXISTING);

            String type = detectType(original);
            String storedUrl = "/uploads/study-drive/" + userId + "/" + savedName;

            SavedStudyItem item = SavedStudyItem.builder()
                    .userId(userId)
                    .sourceId("UPLOAD_" + UUID.randomUUID())
                    .sourceType("UPLOAD")
                    .title(original)
                    .description("")
                    .folderId((folderId == null || folderId.isBlank()) ? null : folderId)
                    .imageUrls(type.equals("IMAGE") ? List.of(storedUrl) : new ArrayList<>())
                    .videoUrl(type.equals("VIDEO") ? storedUrl : null)
                    .attachments(
                            (type.equals("IMAGE") || type.equals("VIDEO"))
                                    ? new ArrayList<>()
                                    : List.of(
                                    SavedStudyItem.Attachment.builder()
                                            .name(original)
                                            .url(storedUrl)
                                            .type(type)
                                            .sizeKb(file.getSize() / 1024)
                                            .build()
                            )
                    )
                    .build();

            return repo.save(item);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi upload file: " + e.getMessage());
        }
    }

    public void delete(String userId, String id) {
        SavedStudyItem item = repo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mục đã lưu"));

        deleteStoredFiles(item);
        repo.delete(item);
    }

    private void deleteStoredFiles(SavedStudyItem item) {
        try {
            if (item.getImageUrls() != null) {
                for (String url : item.getImageUrls()) {
                    deletePhysicalFile(url);
                }
            }
            if (item.getVideoUrl() != null && !item.getVideoUrl().isBlank()) {
                deletePhysicalFile(item.getVideoUrl());
            }
            if (item.getAttachments() != null) {
                for (SavedStudyItem.Attachment a : item.getAttachments()) {
                    deletePhysicalFile(a.getUrl());
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void deletePhysicalFile(String url) throws IOException {
        if (url == null || url.isBlank() || !url.startsWith("/uploads/")) return;

        String relative = url.replaceFirst("/uploads/", "");
        Path path = Paths.get(uploadDir).resolve(relative);
        Files.deleteIfExists(path);
    }

    private String copyFileToStudyDrive(String userId, String oldUrl) {
        try {
            if (oldUrl == null || oldUrl.isBlank()) return oldUrl;
            if (!oldUrl.startsWith("/uploads/")) return oldUrl;

            String relative = oldUrl.replaceFirst("/uploads/", "");
            Path oldPath = Paths.get(uploadDir).resolve(relative).normalize();

            if (!Files.exists(oldPath) || !Files.isRegularFile(oldPath)) {
                return oldUrl;
            }

            String originalFilename = oldPath.getFileName().toString();
            String ext = "";
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0) ext = originalFilename.substring(dot);

            String newFileName = UUID.randomUUID() + ext;
            Path newDir = Paths.get(uploadDir, "study-drive", userId);
            Files.createDirectories(newDir);

            Path newPath = newDir.resolve(newFileName);
            Files.copy(oldPath, newPath, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/study-drive/" + userId + "/" + newFileName;
        } catch (Exception e) {
            return oldUrl;
        }
    }

    private String detectType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
            return "IMAGE";
        }
        if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".mkv")) {
            return "VIDEO";
        }
        if (lower.endsWith(".pdf")) return "PDF";
        if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "DOCX";
        if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "PPTX";
        if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv")) return "EXCEL";
        return "FILE";
    }
}