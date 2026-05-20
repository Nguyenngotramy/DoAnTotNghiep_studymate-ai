package com.studymate.service;

import com.studymate.model.Group;
import com.studymate.model.GroupPost;
import com.studymate.model.PredictRecord;
import com.studymate.model.StudyDocument;
import com.studymate.model.Task;
import com.studymate.model.User;
import com.studymate.model.study.StudyProfile;
import com.studymate.model.study.StudySubjectRecord;
import com.studymate.model.study.StudyTermRecord;
import com.studymate.repository.GroupPostRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.PredictRecordRepository;
import com.studymate.repository.StudyDocumentRepository;
import com.studymate.repository.TaskRepository;
import com.studymate.repository.UserRepository;
import com.studymate.repository.study.StudyProfileRepository;
import com.studymate.repository.study.StudySubjectRecordRepository;
import com.studymate.repository.study.StudyTermRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepo;
    private final GroupRepository groupRepo;
    private final PredictRecordRepository predictRepo;
    private final TaskRepository taskRepo;
    private final StudyDocumentRepository docRepo;
    private final GroupPostRepository groupPostRepo;
    private final StudyProfileRepository studyProfileRepo;
    private final StudyTermRecordRepository studyTermRepo;
    private final StudySubjectRecordRepository studySubjectRepo;
    private final DocumentService documentService;
    private final NotificationService notificationService;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.ml-service.url}")
    private String mlUrl;

    public Map<String, Object> getDashboard() {
        List<User> users = userRepo.findAll();
        List<Task> tasks = taskRepo.findAll();
        List<StudyDocument> docs = docRepo.findAll();
        List<PredictRecord> predicts = predictRepo.findAll();
        List<GroupPost> groupPosts = groupPostRepo.findAll();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("stats", buildStats(users, tasks, docs, predicts));
        data.put("gradeDistribution", buildGradeDistribution(predicts));
        data.put("weakAlerts", buildWeakAlerts(predicts, users));
        data.put("recentActivities", buildRecentActivities(users, docs, predicts, tasks, groupPosts));
        data.put("trends", buildTrends(users, docs, tasks, groupPosts));
        data.put("actionRequired", buildActionRequired(users, predicts, docs, tasks, groupPosts));
        data.put("systemHealth", buildSystemHealth());
        return data;
    }

    public Map<String, Object> getAlertCenter() {
        List<User> users = userRepo.findAll();
        List<PredictRecord> predicts = predictRepo.findAll();
        List<StudyDocument> docs = docRepo.findAll();
        List<Task> tasks = taskRepo.findAll();
        List<GroupPost> groupPosts = groupPostRepo.findAll();

        Map<String, String> groupNameMap = groupRepo.findAll().stream()
                .collect(Collectors.toMap(Group::getId, Group::getName, (a, b) -> a));

        List<Map<String, Object>> reportedPosts = groupPosts.stream()
                .filter(p -> p.getReports() != null && !p.getReports().isEmpty())
                .sorted(Comparator.comparing(GroupPost::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(p -> {
                    String latestReason = p.getReports().isEmpty()
                            ? null
                            : p.getReports().get(p.getReports().size() - 1).getReason();

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", p.getId());
                    row.put("groupId", p.getGroupId());
                    row.put("groupName", groupNameMap.getOrDefault(p.getGroupId(), "Nhóm"));
                    row.put("authorName", p.getAuthorName());
                    row.put("content", p.getContent());
                    row.put("reportsCount", p.getReportsCount());
                    row.put("latestReason", latestReason);
                    row.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
                    return row;
                })
                .toList();

        List<Map<String, Object>> pendingGroupPosts = groupPosts.stream()
                .filter(p -> p.getStatus() == GroupPost.PostStatus.PENDING)
                .sorted(Comparator.comparing(GroupPost::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(p -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", p.getId());
                    row.put("groupId", p.getGroupId());
                    row.put("groupName", groupNameMap.getOrDefault(p.getGroupId(), "Nhóm"));
                    row.put("authorName", p.getAuthorName());
                    row.put("content", p.getContent());
                    row.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
                    return row;
                })
                .toList();

        List<Map<String, Object>> reviewDocuments = docs.stream()
                .filter(d -> d.getReviewStatus() == StudyDocument.ReviewStatus.REPORTED
                        || d.getReviewStatus() == StudyDocument.ReviewStatus.UNDER_REVIEW)
                .sorted(Comparator.comparing(StudyDocument::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(d -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", d.getId());
                    row.put("groupId", d.getGroupId());
                    row.put("groupName", groupNameMap.getOrDefault(d.getGroupId(), "Nhóm"));
                    row.put("name", d.getName());
                    row.put("uploaderName", d.getUploaderName());
                    row.put("type", d.getType());
                    row.put("reviewStatus", d.getReviewStatus() != null ? d.getReviewStatus().name() : "APPROVED");
                    row.put("reportsCount", d.getReportsCount());
                    row.put("flagReason", d.getFlagReason());
                    row.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
                    return row;
                })
                .toList();

        List<Map<String, Object>> lockedUsers = users.stream()
                .filter(User::isLocked)
                .sorted(Comparator.comparing(User::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(u -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", u.getId());
                    row.put("fullName", u.getFullName());
                    row.put("email", u.getEmail());
                    row.put("updatedAt", u.getUpdatedAt() != null ? u.getUpdatedAt().toString() : null);
                    return row;
                })
                .toList();

        Map<String, String> userNameMap = users.stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));

        Map<String, List<PredictRecord>> predictsByUser = predicts.stream()
                .filter(p -> p.getUserId() != null)
                .collect(Collectors.groupingBy(PredictRecord::getUserId));

        List<Map<String, Object>> weakLearners = predictsByUser.entrySet().stream()
                .map(entry -> toWeakLearnerRow(entry.getKey(), entry.getValue(), userNameMap))
                .filter(Objects::nonNull)
                .sorted((a, b) -> {
                    int sa = severityScore(String.valueOf(a.get("level")));
                    int sb = severityScore(String.valueOf(b.get("level")));
                    if (sa != sb) return Integer.compare(sb, sa);

                    double ga = ((Number) a.get("gpa")).doubleValue();
                    double gb = ((Number) b.get("gpa")).doubleValue();
                    return Double.compare(ga, gb);
                })
                .toList();

        List<Map<String, Object>> systemWarnings = new ArrayList<>();
        MlHealthResult ml = checkMlHealth();
        systemWarnings.add(systemRow("ml-health", ml.level(), "ML service", ml.message(), Instant.now()));

        long overdueTasks = tasks.stream()
                .filter(t -> t.getDeadline() != null && t.getDeadline().isBefore(Instant.now()) && t.getStatus() != Task.Status.DONE)
                .count();

        if (overdueTasks > 0) {
            systemWarnings.add(systemRow(
                    "tasks-overdue",
                    "warning",
                    "Task quá hạn",
                    overdueTasks + " task đang quá hạn chưa hoàn thành",
                    Instant.now()
            ));
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("reportedPosts", reportedPosts.size());
        summary.put("pendingGroupPosts", pendingGroupPosts.size());
        summary.put("reviewDocuments", reviewDocuments.size());
        summary.put("lockedUsers", lockedUsers.size());
        summary.put("weakLearners", weakLearners.size());
        summary.put("systemWarnings", systemWarnings.size());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("summary", summary);
        data.put("reportedPosts", reportedPosts);
        data.put("pendingGroupPosts", pendingGroupPosts);
        data.put("reviewDocuments", reviewDocuments);
        data.put("lockedUsers", lockedUsers);
        data.put("weakLearners", weakLearners);
        data.put("systemWarnings", systemWarnings);
        return data;
    }

    public Map<String, Object> getUserDetail(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<Group> groups = groupRepo.findByMemberId(userId);
        List<PredictRecord> predictHistory = predictRepo.findByUserIdOrderByCreatedAtDesc(userId);
        StudyProfile studyProfile = studyProfileRepo.findByUserId(userId).orElse(null);
        List<StudyTermRecord> studyTerms = studyTermRepo.findByUserIdOrderByUpdatedAtDesc(userId);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", user);
        data.put("groupCount", groups.size());
        data.put("groups", groups.stream().map(g -> {
            Group.GroupMember self = g.getMembers() == null ? null : g.getMembers().stream()
                    .filter(m -> Objects.equals(m.getUserId(), userId))
                    .findFirst()
                    .orElse(null);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", g.getId());
            row.put("name", g.getName());
            row.put("subject", g.getSubject());
            row.put("memberCount", g.getMemberCount());
            row.put("roleInGroup", self != null && self.getRole() != null ? self.getRole().name() : "MEMBER");
            row.put("joinedAt", self != null && self.getJoinedAt() != null ? self.getJoinedAt().toString() : null);
            return row;
        }).toList());

        data.put("studyProfile", studyProfile);
        data.put("studyTermCount", studyTerms.size());
        data.put("latestStudyTerm", studyTerms.isEmpty() ? null : studyTerms.get(0));
        data.put("predictCount", predictHistory.size());
        data.put("latestPrediction", predictHistory.isEmpty() ? null : predictHistory.get(0));
        data.put("supportStatus", buildUserSupportStatus(userId, predictHistory, studyTerms));
        return data;
    }

    public List<Map<String, Object>> getUserActivity(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<Map<String, Object>> activity = new ArrayList<>();

        if (user.getCreatedAt() != null) {
            activity.add(activityRow(
                    "USER_REGISTERED",
                    "Tạo tài khoản",
                    safe(user.getFullName(), safe(user.getEmail(), "Người dùng")) + " đã tạo tài khoản",
                    user.getCreatedAt()
            ));
        }

        predictRepo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .limit(8)
                .forEach(p -> activity.add(activityRow(
                        "PREDICT",
                        "Dự đoán học lực",
                        "Dự đoán " + safe(p.getPredictedGrade(), "UNKNOWN") + " với GPA " + p.getGpa(),
                        p.getCreatedAt()
                )));

        studyTermRepo.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .limit(8)
                .forEach(t -> activity.add(activityRow(
                        "TERM_UPDATED",
                        "Cập nhật học kỳ",
                        safe(t.getSemesterLabel(), "Học kỳ") + " - " + safe(t.getClassification(), "Chưa xếp loại"),
                        t.getUpdatedAt() != null ? t.getUpdatedAt() : t.getCreatedAt()
                )));

        docRepo.findAll().stream()
                .filter(d -> Objects.equals(d.getUploaderId(), userId))
                .sorted(Comparator.comparing(StudyDocument::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .forEach(d -> activity.add(activityRow(
                        "DOC_UPLOAD",
                        "Upload tài liệu",
                        safe(d.getName(), "Tài liệu mới"),
                        d.getCreatedAt()
                )));

        groupPostRepo.findAll().stream()
                .filter(p -> Objects.equals(p.getAuthorId(), userId))
                .sorted(Comparator.comparing(GroupPost::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .forEach(p -> activity.add(activityRow(
                        "GROUP_POST",
                        "Đăng bài trong nhóm",
                        abbreviate(safe(p.getContent(), "Bài đăng nhóm"), 90),
                        p.getCreatedAt()
                )));

        groupRepo.findByMemberId(userId).forEach(g -> {
            if (g.getMembers() == null) return;
            g.getMembers().stream()
                    .filter(m -> Objects.equals(m.getUserId(), userId))
                    .findFirst()
                    .ifPresent(m -> activity.add(activityRow(
                            "GROUP_JOIN",
                            "Tham gia nhóm",
                            "Đã tham gia nhóm " + safe(g.getName(), "Nhóm học"),
                            m.getJoinedAt()
                    )));
        });

        return activity.stream()
                .sorted((a, b) -> {
                    String ta = String.valueOf(a.get("createdAt"));
                    String tb = String.valueOf(b.get("createdAt"));
                    if (ta == null || "null".equals(ta)) return 1;
                    if (tb == null || "null".equals(tb)) return -1;
                    return tb.compareTo(ta);
                })
                .limit(20)
                .toList();
    }

    public List<PredictRecord> getUserPredictHistory(String userId) {
        userRepo.findById(userId).orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        return predictRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Map<String, Object>> getUserStudyTerms(String userId) {
        userRepo.findById(userId).orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return studyTermRepo.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(term -> {
                    List<StudySubjectRecord> subjects = studySubjectRepo.findByTermIdAndUserIdOrderByCreatedAtAsc(term.getId(), userId);
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("term", term);
                    row.put("subjects", subjects);
                    row.put("subjectCount", subjects.size());
                    return row;
                })
                .toList();
    }

    public Map<String, Object> getAdminGroups(int page, String search, String filter) {
        List<Group> allGroups = groupRepo.findAll();

        List<Map<String, Object>> rows = allGroups.stream()
                .map(this::mapAdminGroupRow)
                .toList();

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            rows = rows.stream()
                    .filter(g -> String.valueOf(g.get("name")).toLowerCase().contains(q)
                            || String.valueOf(g.getOrDefault("subject", "")).toLowerCase().contains(q))
                    .toList();
        }

        if (filter != null && !filter.isBlank() && !"ALL".equalsIgnoreCase(filter)) {
            rows = switch (filter.toUpperCase(Locale.ROOT)) {
                case "PUBLIC" -> rows.stream().filter(g -> Boolean.TRUE.equals(g.get("publicVisible"))).toList();
                case "PRIVATE" -> rows.stream().filter(g -> !Boolean.TRUE.equals(g.get("publicVisible"))).toList();
                case "PENDING" -> rows.stream().filter(g -> ((Number) g.get("pendingPostsCount")).intValue() > 0).toList();
                case "REPORTED" -> rows.stream().filter(g -> ((Number) g.get("reportedPostsCount")).intValue() > 0).toList();
                case "OVERDUE" -> rows.stream().filter(g -> ((Number) g.get("overdueTasksCount")).intValue() > 0).toList();
                default -> rows;
            };
        }

        int pageSize = 20;
        int total = rows.size();
        int totalPages = Math.max(1, (int) Math.ceil(total / (double) pageSize));
        int safePage = Math.max(0, Math.min(page, totalPages - 1));
        int start = safePage * pageSize;
        int end = Math.min(start + pageSize, total);

        List<Map<String, Object>> content = start < total ? rows.subList(start, end) : List.of();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("content", content);
        res.put("page", safePage);
        res.put("size", pageSize);
        res.put("totalElements", total);
        res.put("totalPages", totalPages);
        return res;
    }

    public Map<String, Object> getAdminGroupDetail(String groupId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm"));

        List<GroupPost> allPosts = groupPostRepo.findByGroupIdOrderByCreatedAtDesc(groupId);
        List<Task> allTasks = taskRepo.findByGroupIdOrderByCreatedAtDesc(groupId);
        List<StudyDocument> allDocs = docRepo.findByGroupIdOrderByCreatedAtDesc(groupId);

        List<GroupPost> pendingPosts = allPosts.stream()
                .filter(p -> p.getStatus() == GroupPost.PostStatus.PENDING)
                .toList();

        List<GroupPost> reportedPosts = allPosts.stream()
                .filter(p -> p.getReports() != null && !p.getReports().isEmpty())
                .toList();

        List<Task> overdueTasks = allTasks.stream()
                .filter(t -> t.getDeadline() != null
                        && t.getDeadline().isBefore(Instant.now())
                        && t.getStatus() != Task.Status.DONE)
                .toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("group", group);
        res.put("members", group.getMembers() == null ? List.of() : group.getMembers());

        res.put("pendingPosts", pendingPosts.stream().map(p -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("authorName", p.getAuthorName());
            row.put("content", p.getContent());
            row.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
            return row;
        }).toList());

        res.put("reportedPosts", reportedPosts.stream().map(p -> {
            String latestReason = (p.getReports() != null && !p.getReports().isEmpty())
                    ? p.getReports().get(p.getReports().size() - 1).getReason()
                    : null;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("authorName", p.getAuthorName());
            row.put("content", p.getContent());
            row.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
            row.put("reportsCount", p.getReportsCount());
            row.put("latestReason", latestReason);
            return row;
        }).toList());

        res.put("overdueTasks", overdueTasks.stream().map(t -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", t.getId());
            row.put("title", t.getTitle());
            row.put("status", t.getStatus() != null ? t.getStatus().name() : null);
            row.put("deadline", t.getDeadline() != null ? t.getDeadline().toString() : null);
            row.put("assigneeId", t.getAssigneeId());
            return row;
        }).toList());

        res.put("documents", allDocs.stream().map(d -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", d.getId());
            row.put("name", d.getName());
            row.put("type", d.getType());
            row.put("uploaderName", d.getUploaderName());
            row.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
            return row;
        }).toList());

        return res;
    }

    public void forceDeleteGroup(String groupId, String reason) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm"));

        List<Task> tasks = taskRepo.findByGroupIdOrderByCreatedAtDesc(groupId);
        List<GroupPost> posts = groupPostRepo.findByGroupIdOrderByCreatedAtDesc(groupId);
        List<StudyDocument> docs = docRepo.findByGroupIdOrderByCreatedAtDesc(groupId);

        if (!tasks.isEmpty()) taskRepo.deleteAll(tasks);
        if (!posts.isEmpty()) groupPostRepo.deleteAll(posts);
        if (!docs.isEmpty()) docRepo.deleteAll(docs);

        groupRepo.delete(group);
    }

    public GroupPost approveGroupPost(String postId) {
        GroupPost post = groupPostRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài đăng nhóm"));

        post.setStatus(GroupPost.PostStatus.APPROVED);
        post.setRejectedAt(null);
        post.setRejectedBy(null);
        post.setRejectedReason(null);
        post.setApprovedAt(Instant.now());
        return groupPostRepo.save(post);
    }

    public GroupPost rejectGroupPost(String postId, String reason) {
        GroupPost post = groupPostRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài đăng nhóm"));

        post.setStatus(GroupPost.PostStatus.REJECTED);
        post.setRejectedAt(Instant.now());
        post.setRejectedReason(reason == null || reason.isBlank() ? "Không phù hợp" : reason.trim());
        return groupPostRepo.save(post);
    }

    public StudyDocument approveDocument(String docId) {
        return documentService.approveDocument(docId, "ADMIN", "Quản trị viên", "Đã duyệt bởi admin");
    }

    public StudyDocument rejectDocument(String docId, String reason) {
        return documentService.rejectDocument(
                docId,
                "ADMIN",
                "Quản trị viên",
                reason == null || reason.isBlank() ? "Tài liệu chưa hợp lệ" : reason.trim()
        );
    }

    public StudyDocument markDocumentUnderReview(String docId, String reason) {
        return documentService.markUnderReview(
                docId,
                "ADMIN",
                "Quản trị viên",
                reason == null || reason.isBlank() ? "Đang cần xem xét thêm" : reason.trim()
        );
    }

    public List<Map<String, Object>> getAdminDocuments(
            String status,
            String groupId,
            String type,
            String uploader
    ) {
        Map<String, String> groupNameMap = groupRepo.findAll().stream()
                .collect(Collectors.toMap(Group::getId, Group::getName, (a, b) -> a));

        List<StudyDocument> docs = docRepo.findAll();

        return docs.stream()
                .filter(d -> d.getReviewStatus() == StudyDocument.ReviewStatus.REPORTED
                        || d.getReviewStatus() == StudyDocument.ReviewStatus.UNDER_REVIEW
                        || d.getReviewStatus() == StudyDocument.ReviewStatus.APPROVED
                        || d.getReviewStatus() == StudyDocument.ReviewStatus.REJECTED
                        || d.getReviewStatus() == StudyDocument.ReviewStatus.REMOVED)
                .filter(d -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)
                        || (d.getReviewStatus() != null && d.getReviewStatus().name().equalsIgnoreCase(status)))
                .filter(d -> groupId == null || groupId.isBlank()
                        || Objects.equals(d.getGroupId(), groupId))
                .filter(d -> type == null || type.isBlank() || "ALL".equalsIgnoreCase(type)
                        || (d.getType() != null && d.getType().equalsIgnoreCase(type)))
                .filter(d -> uploader == null || uploader.isBlank()
                        || (d.getUploaderName() != null
                        && d.getUploaderName().toLowerCase().contains(uploader.toLowerCase())))
                .sorted(Comparator.comparing(
                        StudyDocument::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(d -> {
                    String latestReason = null;

                    if (d.getReports() != null && !d.getReports().isEmpty()) {
                        latestReason = d.getReports()
                                .get(d.getReports().size() - 1)
                                .getReason();
                    }

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", d.getId());
                    row.put("groupId", d.getGroupId());
                    row.put("groupName", groupNameMap.getOrDefault(d.getGroupId(), "Nhóm"));
                    row.put("name", d.getName());
                    row.put("fileUrl", d.getFileUrl());
                    row.put("type", d.getType());
                    row.put("sizeKb", d.getSizeKb());
                    row.put("uploaderId", d.getUploaderId());
                    row.put("uploaderName", d.getUploaderName());
                    row.put("sourceType", d.getSourceType() != null ? d.getSourceType().name() : "PAGE");
                    row.put("reviewStatus", d.getReviewStatus() != null ? d.getReviewStatus().name() : "APPROVED");
                    row.put("reportsCount", d.getReportsCount());
                    row.put("flagReason", d.getFlagReason());
                    row.put("latestReason", latestReason);
                    row.put("reviewNote", d.getReviewNote());
                    row.put("reviewedBy", d.getReviewedBy());
                    row.put("reviewedByName", d.getReviewedByName());
                    row.put("reviewedAt", d.getReviewedAt() != null ? d.getReviewedAt().toString() : null);
                    row.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
                    row.put("reports", d.getReports() == null ? List.of() : d.getReports());

                    return row;
                })
                .toList();
    }

    public StudyDocument removeDocument(String docId, String reason) {
        StudyDocument doc = docRepo.findById(docId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài liệu"));

        doc.setReviewStatus(StudyDocument.ReviewStatus.REMOVED);
        doc.setReviewedBy("ADMIN");
        doc.setReviewedByName("Quản trị viên");
        doc.setReviewedAt(Instant.now());
        doc.setReviewNote(reason == null || reason.isBlank()
                ? "Tài liệu đã bị admin gỡ khỏi hệ thống"
                : reason.trim());
        doc.setFlagReason(doc.getReviewNote());

        return docRepo.save(doc);
    }

    public Map<String, Object> sendSupportReminder(String userId, String title, String message) {
        String finalTitle = (title == null || title.isBlank())
                ? "Hỗ trợ học tập từ StudyMate AI"
                : title.trim();

        String finalMessage = (message == null || message.isBlank())
                ? "Kết quả gần đây cho thấy bạn có thể cần thêm hỗ trợ học tập. Hãy xem lại tài liệu, quiz và nhóm học phù hợp để cải thiện dần nhé."
                : message.trim();

        notificationService.broadcast(List.of(userId), finalTitle, finalMessage);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("userId", userId);
        res.put("title", finalTitle);
        res.put("message", finalMessage);
        res.put("sentAt", Instant.now().toString());
        return res;
    }

    private Map<String, Object> buildStats(
            List<User> users,
            List<Task> tasks,
            List<StudyDocument> docs,
            List<PredictRecord> predicts
    ) {
        Instant sevenDaysAgo = Instant.now().minus(7, ChronoUnit.DAYS);

        long lockedUsers = users.stream().filter(User::isLocked).count();
        long adminCount = users.stream()
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .count();
        long newUsers7d = users.stream()
                .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().isBefore(sevenDaysAgo))
                .count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", users.size());
        stats.put("totalGroups", groupRepo.count());
        stats.put("totalDocs", docs.size());
        stats.put("totalTasks", tasks.size());
        stats.put("totalPredicts", predicts.size());
        stats.put("lockedUsers", lockedUsers);
        stats.put("adminCount", adminCount);
        stats.put("newUsers7d", newUsers7d);
        return stats;
    }

    private List<Map<String, Object>> buildGradeDistribution(List<PredictRecord> predicts) {
        if (predicts.isEmpty()) return List.of();

        Map<String, Long> raw = predicts.stream()
                .collect(Collectors.groupingBy(
                        p -> normalizeGrade(p.getPredictedGrade()),
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        long total = raw.values().stream().mapToLong(Long::longValue).sum();

        List<Map<String, Object>> rows = new ArrayList<>();
        addGradeRow(rows, raw, total, "EXCELLENT", "Xuất sắc", "#22c55e");
        addGradeRow(rows, raw, total, "GOOD", "Giỏi", "#6366f1");
        addGradeRow(rows, raw, total, "FAIR", "Khá", "#f59e0b");
        addGradeRow(rows, raw, total, "AVERAGE", "TB", "#f97316");
        addGradeRow(rows, raw, total, "WEAK", "Yếu", "#ef4444");
        addGradeRow(rows, raw, total, "UNKNOWN", "Khác", "#94a3b8");

        return rows.stream()
                .filter(r -> ((Long) r.get("count")) > 0)
                .toList();
    }

    private void addGradeRow(
            List<Map<String, Object>> rows,
            Map<String, Long> raw,
            long total,
            String key,
            String label,
            String color
    ) {
        long count = raw.getOrDefault(key, 0L);
        long pct = total == 0 ? 0 : Math.round((count * 100.0) / total);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("key", key);
        row.put("label", label);
        row.put("count", count);
        row.put("pct", pct);
        row.put("color", color);
        rows.add(row);
    }

    private List<Map<String, Object>> buildWeakAlerts(List<PredictRecord> predicts, List<User> users) {
        Map<String, String> userNameMap = users.stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));

        Map<String, List<PredictRecord>> predictsByUser = predicts.stream()
                .filter(p -> p.getUserId() != null)
                .collect(Collectors.groupingBy(PredictRecord::getUserId));

        return predictsByUser.entrySet().stream()
                .map(entry -> toWeakLearnerRow(entry.getKey(), entry.getValue(), userNameMap))
                .filter(Objects::nonNull)
                .sorted((a, b) -> {
                    int sa = severityScore(String.valueOf(a.get("level")));
                    int sb = severityScore(String.valueOf(b.get("level")));
                    if (sa != sb) return Integer.compare(sb, sa);
                    double ga = ((Number) a.get("gpa")).doubleValue();
                    double gb = ((Number) b.get("gpa")).doubleValue();
                    return Double.compare(ga, gb);
                })
                .limit(6)
                .toList();
    }

    private Map<String, Object> toWeakLearnerRow(
            String userId,
            List<PredictRecord> records,
            Map<String, String> userNameMap
    ) {
        if (records == null || records.isEmpty()) return null;

        List<PredictRecord> sorted = records.stream()
                .sorted(Comparator.comparing(PredictRecord::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        PredictRecord latest = sorted.get(0);
        double latestGpa = latest.getGpa();

        if (latestGpa <= 0 || latestGpa >= 6.5) return null;

        double previousGpa = sorted.size() > 1 ? sorted.get(1).getGpa() : latestGpa;
        boolean droppedHard = sorted.size() > 1 && (previousGpa - latestGpa) >= 1.0;

        long weakCount = sorted.stream()
                .limit(3)
                .filter(p -> p.getGpa() > 0 && p.getGpa() < 6.0)
                .count();

        String level;
        String issue;

        if (latestGpa < 4.5 || (weakCount >= 3 && latestGpa < 5.5) || droppedHard) {
            level = "CRITICAL";
            issue = "Cần can thiệp sớm";
        } else if (weakCount >= 2 || latestGpa < 5.5) {
            level = "WARNING";
            issue = "Nguy cơ học lực giảm";
        } else {
            level = "INFO";
            issue = "Cần theo dõi thêm";
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", latest.getId());
        row.put("userId", userId);
        row.put("name", userNameMap.getOrDefault(userId, "Người dùng"));
        row.put("gpa", latestGpa);
        row.put("issue", issue);
        row.put("level", level);
        row.put("createdAt", latest.getCreatedAt() != null ? latest.getCreatedAt().toString() : null);
        return row;
    }

    private Map<String, Object> buildUserSupportStatus(
            String userId,
            List<PredictRecord> predictHistory,
            List<StudyTermRecord> studyTerms
    ) {
        Double latestStudyGpa = null;
        if (!studyTerms.isEmpty()) {
            StudyTermRecord latestTerm = studyTerms.get(0);
            latestStudyGpa = latestTerm.getGpa10() != null ? latestTerm.getGpa10() : latestTerm.getAverageScore();
        }

        Double latestPredictGpa = predictHistory.isEmpty() ? null : predictHistory.get(0).getGpa();
        Double effectiveGpa = latestStudyGpa != null ? latestStudyGpa : latestPredictGpa;

        String level = "NORMAL";
        String message = "Chưa có cảnh báo học tập";

        if (effectiveGpa != null) {
            if (effectiveGpa < 4.5) {
                level = "CRITICAL";
                message = "Cần can thiệp sớm";
            } else if (effectiveGpa < 5.5) {
                level = "WARNING";
                message = "Nguy cơ học lực giảm";
            } else if (effectiveGpa < 6.5) {
                level = "INFO";
                message = "Cần theo dõi thêm";
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("userId", userId);
        res.put("effectiveGpa", effectiveGpa);
        res.put("level", level);
        res.put("message", message);
        res.put("source", latestStudyGpa != null ? "STUDY_TERM" : "PREDICT_RECORD");
        return res;
    }

    private List<Map<String, Object>> buildRecentActivities(
            List<User> users,
            List<StudyDocument> docs,
            List<PredictRecord> predicts,
            List<Task> tasks,
            List<GroupPost> groupPosts
    ) {
        List<ActivityRow> rows = new ArrayList<>();

        users.stream()
                .filter(u -> u.getCreatedAt() != null)
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .limit(4)
                .forEach(u -> rows.add(new ActivityRow(
                        u.getCreatedAt(),
                        mapActivity(
                                "user-" + u.getId(),
                                "Người dùng mới",
                                safe(u.getFullName(), safe(u.getEmail(), "Người dùng")) + " vừa tham gia hệ thống",
                                u.getCreatedAt(),
                                "USER"
                        )
                )));

        docs.stream()
                .filter(d -> d.getCreatedAt() != null)
                .sorted(Comparator.comparing(StudyDocument::getCreatedAt).reversed())
                .limit(4)
                .forEach(d -> rows.add(new ActivityRow(
                        d.getCreatedAt(),
                        mapActivity(
                                "doc-" + d.getId(),
                                "Tài liệu mới",
                                safe(d.getUploaderName(), "Một thành viên") + " đã upload " + safe(d.getName(), "tài liệu mới"),
                                d.getCreatedAt(),
                                "DOC"
                        )
                )));

        predicts.stream()
                .filter(p -> p.getCreatedAt() != null)
                .sorted(Comparator.comparing(PredictRecord::getCreatedAt).reversed())
                .limit(4)
                .forEach(p -> rows.add(new ActivityRow(
                        p.getCreatedAt(),
                        mapActivity(
                                "predict-" + p.getId(),
                                "Lượt dự đoán mới",
                                "Có một lượt dự đoán học lực mới với kết quả " + safe(p.getPredictedGrade(), "UNKNOWN"),
                                p.getCreatedAt(),
                                "PREDICT"
                        )
                )));

        tasks.stream()
                .filter(t -> t.getCreatedAt() != null)
                .sorted(Comparator.comparing(Task::getCreatedAt).reversed())
                .limit(4)
                .forEach(t -> rows.add(new ActivityRow(
                        t.getCreatedAt(),
                        mapActivity(
                                "task-" + t.getId(),
                                "Task mới",
                                "Có task mới: " + safe(t.getTitle(), "Chưa đặt tên"),
                                t.getCreatedAt(),
                                "TASK"
                        )
                )));

        groupPosts.stream()
                .filter(p -> p.getCreatedAt() != null)
                .sorted(Comparator.comparing(GroupPost::getCreatedAt).reversed())
                .limit(4)
                .forEach(p -> rows.add(new ActivityRow(
                        p.getCreatedAt(),
                        mapActivity(
                                "group-post-" + p.getId(),
                                "Bài đăng nhóm mới",
                                safe(p.getAuthorName(), "Thành viên") + " vừa đăng bài trong nhóm",
                                p.getCreatedAt(),
                                "GROUP_POST"
                        )
                )));

        return rows.stream()
                .sorted(Comparator.comparing(ActivityRow::createdAt).reversed())
                .limit(8)
                .map(ActivityRow::payload)
                .toList();
    }

    private List<Map<String, Object>> buildTrends(
            List<User> users,
            List<StudyDocument> docs,
            List<Task> tasks,
            List<GroupPost> groupPosts
    ) {
        Instant now = Instant.now();
        Instant sevenDaysAgo = now.minus(7, ChronoUnit.DAYS);
        Instant fourteenDaysAgo = now.minus(14, ChronoUnit.DAYS);

        long usersCurrent = countCreatedBetweenUsers(users, sevenDaysAgo, now);
        long usersPrev = countCreatedBetweenUsers(users, fourteenDaysAgo, sevenDaysAgo);

        long docsCurrent = countCreatedBetweenDocs(docs, sevenDaysAgo, now);
        long docsPrev = countCreatedBetweenDocs(docs, fourteenDaysAgo, sevenDaysAgo);

        long tasksCurrent = countCreatedBetweenTasks(tasks, sevenDaysAgo, now);
        long tasksPrev = countCreatedBetweenTasks(tasks, fourteenDaysAgo, sevenDaysAgo);

        long activeGroupsCurrent = countActiveGroups(tasks, docs, groupPosts, sevenDaysAgo, now);
        long activeGroupsPrev = countActiveGroups(tasks, docs, groupPosts, fourteenDaysAgo, sevenDaysAgo);

        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(trendRow("NEW_USERS_7D", "User mới / 7 ngày", usersCurrent, usersPrev));
        rows.add(trendRow("ACTIVE_GROUPS_7D", "Nhóm hoạt động / 7 ngày", activeGroupsCurrent, activeGroupsPrev));
        rows.add(trendRow("DOCS_7D", "Tài liệu mới / 7 ngày", docsCurrent, docsPrev));
        rows.add(trendRow("TASKS_7D", "Task mới / 7 ngày", tasksCurrent, tasksPrev));

        return rows;
    }

    private long countActiveGroups(
            List<Task> tasks,
            List<StudyDocument> docs,
            List<GroupPost> groupPosts,
            Instant start,
            Instant end
    ) {
        Set<String> groupIds = new HashSet<>();

        tasks.stream()
                .filter(t -> t.getGroupId() != null && t.getCreatedAt() != null
                        && !t.getCreatedAt().isBefore(start) && t.getCreatedAt().isBefore(end))
                .map(Task::getGroupId)
                .forEach(groupIds::add);

        docs.stream()
                .filter(d -> d.getGroupId() != null && d.getCreatedAt() != null
                        && !d.getCreatedAt().isBefore(start) && d.getCreatedAt().isBefore(end))
                .map(StudyDocument::getGroupId)
                .forEach(groupIds::add);

        groupPosts.stream()
                .filter(p -> p.getGroupId() != null && p.getCreatedAt() != null
                        && !p.getCreatedAt().isBefore(start) && p.getCreatedAt().isBefore(end))
                .map(GroupPost::getGroupId)
                .forEach(groupIds::add);

        return groupIds.size();
    }

    private Map<String, Object> trendRow(String key, String label, long current, long previous) {
        long delta;
        if (previous == 0) delta = current > 0 ? 100 : 0;
        else delta = Math.round(((current - previous) * 100.0f) / previous);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("key", key);
        row.put("label", label);
        row.put("current", current);
        row.put("previous", previous);
        row.put("delta", Math.abs(delta));
        row.put("up", current >= previous);
        return row;
    }

    private List<Map<String, Object>> buildActionRequired(
            List<User> users,
            List<PredictRecord> predicts,
            List<StudyDocument> docs,
            List<Task> tasks,
            List<GroupPost> groupPosts
    ) {
        List<Map<String, Object>> items = new ArrayList<>();
        Instant now = Instant.now();
        Instant threeDaysAgo = now.minus(3, ChronoUnit.DAYS);

        long lockedRecently = users.stream()
                .filter(User::isLocked)
                .filter(u -> u.getUpdatedAt() != null && !u.getUpdatedAt().isBefore(threeDaysAgo))
                .count();

        if (lockedRecently > 0) {
            items.add(actionItem(
                    "locked-recent",
                    "warning",
                    "Tài khoản mới bị khóa",
                    lockedRecently + " tài khoản bị khóa trong 3 ngày gần nhất",
                    "/admin/users",
                    "Xem người dùng",
                    now
            ));
        }

        List<Map<String, Object>> weakAlerts = buildWeakAlerts(predicts, users);
        weakAlerts.stream().limit(2).forEach(a -> items.add(actionItem(
                "weak-" + a.get("id"),
                "warning",
                "Người học cần hỗ trợ",
                a.get("name") + " có GPA " + a.get("gpa") + " — " + a.get("issue"),
                "/admin/alerts",
                "Mở cảnh báo",
                parseInstant(String.valueOf(a.get("createdAt")), now)
        )));

        long reviewDocs = docs.stream()
                .filter(d -> d.getReviewStatus() == StudyDocument.ReviewStatus.REPORTED
                        || d.getReviewStatus() == StudyDocument.ReviewStatus.UNDER_REVIEW)
                .count();
        if (reviewDocs > 0) {
            items.add(actionItem(
                    "docs-review",
                    "info",
                    "Tài liệu cần xem xét",
                    reviewDocs + " tài liệu đang bị report hoặc đang xem xét",
                    "/admin/alerts",
                    "Mở cảnh báo",
                    now
            ));
        }

        long reportedPosts = groupPosts.stream()
                .filter(p -> p.getReports() != null && !p.getReports().isEmpty())
                .count();
        if (reportedPosts > 0) {
            items.add(actionItem(
                    "reported-posts",
                    "critical",
                    "Bài đăng bị report",
                    reportedPosts + " bài đăng nhóm đang bị báo cáo",
                    "/admin/alerts",
                    "Mở cảnh báo",
                    now
            ));
        }

        long pendingGroupPosts = groupPosts.stream()
                .filter(p -> p.getStatus() == GroupPost.PostStatus.PENDING)
                .count();
        if (pendingGroupPosts > 0) {
            items.add(actionItem(
                    "pending-group-posts",
                    "warning",
                    "Bài đăng chờ duyệt",
                    pendingGroupPosts + " bài đăng nhóm đang chờ leader duyệt",
                    "/admin/alerts",
                    "Mở cảnh báo",
                    now
            ));
        }

        long overdueTasks = tasks.stream()
                .filter(t -> t.getDeadline() != null && t.getDeadline().isBefore(now) && t.getStatus() != Task.Status.DONE)
                .count();
        if (overdueTasks > 0) {
            items.add(actionItem(
                    "tasks-overdue",
                    "critical",
                    "Task quá hạn tăng",
                    overdueTasks + " task đang quá hạn chưa hoàn thành",
                    "/admin/groups",
                    "Xem nhóm học",
                    now
            ));
        }

        MlHealthResult mlHealth = checkMlHealth();
        items.add(actionItem(
                "ml-health",
                mlHealth.level(),
                "ML service",
                mlHealth.message(),
                "/admin/ml",
                "Mở kết quả ML",
                now
        ));

        return items.stream().limit(6).toList();
    }

    private Map<String, Object> actionItem(
            String id,
            String level,
            String title,
            String message,
            String actionUrl,
            String actionLabel,
            Instant createdAt
    ) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", id);
        item.put("level", level);
        item.put("title", title);
        item.put("message", message);
        item.put("actionUrl", actionUrl);
        item.put("actionLabel", actionLabel);
        item.put("createdAt", createdAt != null ? createdAt.toString() : null);
        return item;
    }

    private Map<String, Object> buildSystemHealth() {
        Map<String, Object> health = new LinkedHashMap<>();

        String dbStatus = "UP";
        try {
            userRepo.count();
            groupRepo.count();
        } catch (Exception e) {
            dbStatus = "DOWN";
        }

        MlHealthResult mlHealth = checkMlHealth();

        String overall = "HEALTHY";
        String message = "Hệ thống đang hoạt động ổn định";

        if ("DOWN".equals(dbStatus) || "critical".equals(mlHealth.level())) {
            overall = "ERROR";
            message = "Có thành phần hệ thống đang lỗi, cần kiểm tra ngay";
        } else if ("warning".equals(mlHealth.level())) {
            overall = "WARNING";
            message = "Một số dịch vụ đang cần theo dõi thêm";
        }

        health.put("status", overall);
        health.put("db", dbStatus);
        health.put("ml", mlHealth.status());
        health.put("message", message);
        return health;
    }

    private MlHealthResult checkMlHealth() {
        try {
            Map<?, ?> res = webClientBuilder.build()
                    .get()
                    .uri(mlUrl + "/health")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            Object rawStatus = (res != null) ? res.get("status") : null;
            String status = rawStatus != null ? String.valueOf(rawStatus) : "UP";

            if ("UP".equalsIgnoreCase(status) || "OK".equalsIgnoreCase(status)) {
                return new MlHealthResult("UP", "success", "ML service đang phản hồi bình thường");
            }
            return new MlHealthResult("WARNING", "warning", "ML service phản hồi nhưng trạng thái chưa ổn định");
        } catch (Exception e) {
            return new MlHealthResult("DOWN", "warning", "Không kiểm tra được ML service hoặc endpoint /health chưa sẵn sàng");
        }
    }

    private Map<String, Object> systemRow(String id, String level, String title, String message, Instant createdAt) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("level", level);
        row.put("title", title);
        row.put("message", message);
        row.put("createdAt", createdAt != null ? createdAt.toString() : null);
        return row;
    }

    private long countCreatedBetweenUsers(List<User> items, Instant start, Instant end) {
        return items.stream()
                .filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().isBefore(start) && i.getCreatedAt().isBefore(end))
                .count();
    }

    private long countCreatedBetweenDocs(List<StudyDocument> items, Instant start, Instant end) {
        return items.stream()
                .filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().isBefore(start) && i.getCreatedAt().isBefore(end))
                .count();
    }

    private long countCreatedBetweenTasks(List<Task> items, Instant start, Instant end) {
        return items.stream()
                .filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().isBefore(start) && i.getCreatedAt().isBefore(end))
                .count();
    }

    private Map<String, Object> mapActivity(
            String id,
            String title,
            String subtitle,
            Instant createdAt,
            String type
    ) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("title", title);
        map.put("subtitle", subtitle);
        map.put("createdAt", createdAt != null ? createdAt.toString() : null);
        map.put("type", type);
        return map;
    }

    private Map<String, Object> activityRow(
            String type,
            String title,
            String subtitle,
            Instant createdAt
    ) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("type", type);
        row.put("title", title);
        row.put("subtitle", subtitle);
        row.put("createdAt", createdAt != null ? createdAt.toString() : null);
        return row;
    }

    private Map<String, Object> mapAdminGroupRow(Group group) {
        List<GroupPost> posts = groupPostRepo.findByGroupIdOrderByCreatedAtDesc(group.getId());
        List<Task> tasks = taskRepo.findByGroupIdOrderByCreatedAtDesc(group.getId());
        List<StudyDocument> docs = docRepo.findByGroupIdOrderByCreatedAtDesc(group.getId());

        long pendingPostsCount = posts.stream()
                .filter(p -> p.getStatus() == GroupPost.PostStatus.PENDING)
                .count();

        long reportedPostsCount = posts.stream()
                .filter(p -> p.getReports() != null && !p.getReports().isEmpty())
                .count();

        long overdueTasksCount = tasks.stream()
                .filter(t -> t.getDeadline() != null
                        && t.getDeadline().isBefore(Instant.now())
                        && t.getStatus() != Task.Status.DONE)
                .count();

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", group.getId());
        row.put("name", group.getName());
        row.put("subject", group.getSubject());
        row.put("description", group.getDescription());
        row.put("publicVisible", group.isPublicVisible());
        row.put("requireApproval", group.isRequireApproval());
        row.put("requirePostApproval", group.isRequirePostApproval());
        row.put("memberCount", group.getMemberCount());
        row.put("pendingPostsCount", pendingPostsCount);
        row.put("reportedPostsCount", reportedPostsCount);
        row.put("overdueTasksCount", overdueTasksCount);
        row.put("totalTasksCount", tasks.size());
        row.put("totalDocumentsCount", docs.size());
        row.put("createdAt", group.getCreatedAt() != null ? group.getCreatedAt().toString() : null);
        row.put("updatedAt", group.getUpdatedAt() != null ? group.getUpdatedAt().toString() : null);
        return row;
    }

    private int severityScore(String level) {
        return switch (level) {
            case "CRITICAL" -> 3;
            case "WARNING" -> 2;
            default -> 1;
        };
    }

    private Instant parseInstant(String raw, Instant fallback) {
        try {
            return raw == null || raw.isBlank() || "null".equals(raw) ? fallback : Instant.parse(raw);
        } catch (Exception e) {
            return fallback;
        }
    }

    private String normalizeGrade(String raw) {
        if (raw == null || raw.isBlank()) return "UNKNOWN";
        String g = raw.trim().toUpperCase(Locale.ROOT);

        return switch (g) {
            case "XUAT_SAC", "XUẤT SẮC", "EXCELLENT", "A+" -> "EXCELLENT";
            case "GIOI", "GIỎI", "GOOD", "A", "B+" -> "GOOD";
            case "KHA", "KHÁ", "FAIR", "B" -> "FAIR";
            case "TRUNG_BINH", "TRUNG BÌNH", "AVERAGE", "C" -> "AVERAGE";
            case "YEU", "YẾU", "WEAK", "D", "F" -> "WEAK";
            default -> "UNKNOWN";
        };
    }

    private String safe(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private String abbreviate(String value, int max) {
        if (value == null) return "";
        if (value.length() <= max) return value;
        return value.substring(0, max - 3) + "...";
    }

    private record ActivityRow(Instant createdAt, Map<String, Object> payload) {}
    private record MlHealthResult(String status, String level, String message) {}
}
