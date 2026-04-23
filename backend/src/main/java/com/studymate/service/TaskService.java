package com.studymate.service;

import com.studymate.dto.request.TaskRequest;
import com.studymate.model.Group;
import com.studymate.model.Task;
import com.studymate.repository.TaskRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepo;
    private final UserRepository userRepo;
    private final NotificationService notifService;
    private final GroupService groupService;

    public List<Task> getByGroup(String groupId) {
        return taskRepo.findByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public Task getOne(String groupId, String taskId) {
        return taskRepo.findByIdAndGroupId(taskId, groupId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy task"));
    }

    public Task create(String groupId, String userId, TaskRequest req) {
        String assigneeId = blankToNull(req.getAssigneeId());
        String assigneeName = findUserFullName(assigneeId);
        String creatorName = findUserFullName(userId);

        Task task = Task.builder()
                .groupId(groupId)
                .personal(false)
                .title(req.getTitle())
                .description(req.getDescription())
                .status(defaultStatus(req.getStatus()))
                .priority(defaultPriority(req.getPriority()))
                .label(req.getLabel())
                .labelColor(defaultLabelColor(req.getLabelColor()))
                .assigneeId(assigneeId)
                .assigneeName(assigneeName)
                .deadline(req.getDeadline())
                .createdById(userId)
                .createdByName(creatorName)
                .build();

        Task saved = taskRepo.save(task);

        if (assigneeId != null && !assigneeId.equals(userId)) {
            notifService.send(
                    assigneeId,
                    "Bạn được giao task mới",
                    "Task: " + req.getTitle(),
                    "TASK_ASSIGNED",
                    "/groups/" + groupId + "/kanban/" + saved.getId()
            );
        }

        return saved;
    }

    public Task update(String groupId, String taskId, String userId, TaskRequest req) {
        Task task = getOne(groupId, taskId);

        String assigneeId = blankToNull(req.getAssigneeId());

        task.setTitle(req.getTitle());
        task.setDescription(req.getDescription());
        task.setStatus(defaultStatus(req.getStatus()));
        task.setPriority(defaultPriority(req.getPriority()));
        task.setLabel(req.getLabel());
        task.setLabelColor(defaultLabelColor(req.getLabelColor()));
        task.setAssigneeId(assigneeId);
        task.setAssigneeName(findUserFullName(assigneeId));
        task.setDeadline(req.getDeadline());

        Task saved = taskRepo.save(task);

        if (assigneeId != null && !assigneeId.equals(userId)) {
            notifService.send(
                    assigneeId,
                    "Task của bạn vừa được cập nhật",
                    "Task: " + req.getTitle(),
                    "TASK_UPDATED",
                    "/groups/" + groupId + "/kanban/" + saved.getId()
            );
        }

        return saved;
    }

    public Task updateStatus(String groupId, String taskId, Task.Status status) {
        Task task = getOne(groupId, taskId);
        task.setStatus(status);
        return taskRepo.save(task);
    }

    public void delete(String groupId, String taskId) {
        Task task = getOne(groupId, taskId);
        taskRepo.delete(task);
    }

    // =========================
    // TASK CÁ NHÂN
    // =========================

    public List<Task> getPersonalTasks(String userId) {
        return taskRepo.findByPersonalTrueAndCreatedByIdOrderByCreatedAtDesc(userId);
    }

    public Task getOnePersonal(String taskId, String userId) {
        Task task = taskRepo.findByIdAndPersonalTrue(taskId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy task cá nhân"));

        if (!Objects.equals(task.getCreatedById(), userId) && !Objects.equals(task.getAssigneeId(), userId)) {
            throw new RuntimeException("Bạn không có quyền xem task cá nhân này");
        }

        return task;
    }

    public Task createPersonal(String userId, TaskRequest req) {
        String creatorName = findUserFullName(userId);

        Task task = Task.builder()
                .groupId(null)
                .personal(true)
                .title(req.getTitle())
                .description(req.getDescription())
                .status(defaultStatus(req.getStatus()))
                .priority(defaultPriority(req.getPriority()))
                .label(req.getLabel())
                .labelColor(defaultLabelColor(req.getLabelColor()))
                .assigneeId(userId)
                .assigneeName(creatorName)
                .deadline(req.getDeadline())
                .createdById(userId)
                .createdByName(creatorName)
                .build();

        return taskRepo.save(task);
    }

    public Task updatePersonal(String taskId, String userId, TaskRequest req) {
        Task task = taskRepo.findByIdAndPersonalTrue(taskId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy task cá nhân"));

        if (!Objects.equals(task.getCreatedById(), userId)) {
            throw new RuntimeException("Bạn không có quyền sửa task cá nhân này");
        }

        task.setTitle(req.getTitle());
        task.setDescription(req.getDescription());
        task.setStatus(defaultStatus(req.getStatus()));
        task.setPriority(defaultPriority(req.getPriority()));
        task.setLabel(req.getLabel());
        task.setLabelColor(defaultLabelColor(req.getLabelColor()));
        task.setDeadline(req.getDeadline());

        return taskRepo.save(task);
    }

    public Task updatePersonalStatus(String taskId, String userId, Task.Status status) {
        Task task = taskRepo.findByIdAndPersonalTrue(taskId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy task cá nhân"));

        if (!Objects.equals(task.getCreatedById(), userId) && !Objects.equals(task.getAssigneeId(), userId)) {
            throw new RuntimeException("Bạn không có quyền cập nhật task này");
        }

        task.setStatus(status);
        return taskRepo.save(task);
    }

    public void deletePersonal(String taskId, String userId) {
        Task task = taskRepo.findByIdAndPersonalTrue(taskId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy task cá nhân"));

        if (!Objects.equals(task.getCreatedById(), userId)) {
            throw new RuntimeException("Bạn không có quyền xoá task cá nhân này");
        }

        taskRepo.delete(task);
    }

    public Task submitPersonal(
            String taskId,
            String userId,
            String userName,
            String answerText,
            List<Map<String, Object>> files,
            List<Map<String, Object>> images
    ) {
        Task task = taskRepo.findByIdAndPersonalTrue(taskId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy task cá nhân"));

        if (!Objects.equals(task.getCreatedById(), userId) && !Objects.equals(task.getAssigneeId(), userId)) {
            throw new RuntimeException("Bạn không có quyền nộp bài cho task này");
        }

        Task.Submission submission = Optional.ofNullable(task.getSubmission())
                .orElse(Task.Submission.builder().build());

        submission.setAnswerText(answerText);
        submission.setFiles(toAttachments(files));
        submission.setImages(toAttachments(images));
        submission.setSubmitted(true);
        submission.setSubmittedAt(Instant.now());
        submission.setSubmittedById(userId);
        submission.setSubmittedByName(userName);

        task.setSubmission(submission);
        return taskRepo.save(task);
    }

    public Task clearPersonalSubmission(String taskId, String userId) {
        Task task = taskRepo.findByIdAndPersonalTrue(taskId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy task cá nhân"));

        if (!Objects.equals(task.getCreatedById(), userId) && !Objects.equals(task.getAssigneeId(), userId)) {
            throw new RuntimeException("Bạn không có quyền xoá bài nộp của task này");
        }

        task.setSubmission(Task.Submission.builder().build());
        return taskRepo.save(task);
    }

    // =========================
    // TRANG NHIỆM VỤ CỦA TÔI
    // =========================

    public List<Task> getMyTasks(String userId, String mode, String groupId) {
        String safeMode = mode == null ? "ALL" : mode.trim().toUpperCase();

        if ("PERSONAL".equals(safeMode)) {
            return taskRepo.findByPersonalTrueAndCreatedByIdOrderByCreatedAtDesc(userId);
        }

        if ("GROUP".equals(safeMode)) {
            if (groupId == null || groupId.isBlank()) {
                throw new RuntimeException("Thiếu groupId khi lọc task theo nhóm");
            }

            List<Task> assigned = taskRepo.findByGroupIdAndAssigneeIdOrderByCreatedAtDesc(groupId, userId);
            List<Task> created = taskRepo.findByGroupIdAndCreatedByIdOrderByCreatedAtDesc(groupId, userId);

            return mergeAndSortTasks(assigned, created);
        }

        List<Group> groups = groupService.getMyGroups(userId);
        List<String> groupIds = groups.stream().map(Group::getId).collect(Collectors.toList());

        List<Task> assignedGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndAssigneeIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> createdGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndCreatedByIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> personalTasks = taskRepo.findByPersonalTrueAndCreatedByIdOrderByCreatedAtDesc(userId);

        return mergeAndSortTasks(assignedGroupTasks, createdGroupTasks, personalTasks);
    }

    public Map<String, Object> getMyTaskProgress(String userId) {
        List<Group> groups = groupService.getMyGroups(userId);
        List<String> groupIds = groups.stream().map(Group::getId).collect(Collectors.toList());

        List<Task> assignedGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndAssigneeIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> createdGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndCreatedByIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> personalTasks = taskRepo.findByPersonalTrueAndCreatedByIdOrderByCreatedAtDesc(userId);

        List<Task> all = mergeAndSortTasks(assignedGroupTasks, createdGroupTasks, personalTasks);

        long todo = all.stream().filter(t -> t.getStatus() == Task.Status.TODO).count();
        long inProgress = all.stream().filter(t -> t.getStatus() == Task.Status.IN_PROGRESS).count();
        long done = all.stream().filter(t -> t.getStatus() == Task.Status.DONE).count();
        long overdue = all.stream()
                .filter(t -> t.getDeadline() != null)
                .filter(t -> t.getStatus() != Task.Status.DONE)
                .filter(t -> t.getDeadline().isBefore(Instant.now()))
                .count();

        Map<String, Long> byMonth = all.stream()
                .filter(t -> t.getDeadline() != null)
                .collect(Collectors.groupingBy(
                        t -> {
                            Instant d = t.getDeadline();
                            return d.toString().substring(0, 7);
                        },
                        TreeMap::new,
                        Collectors.counting()
                ));

        List<Map<String, Object>> roadmap = all.stream()
                .sorted(Comparator.comparing(Task::getDeadline, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(t -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", t.getId());
                    item.put("title", t.getTitle());
                    item.put("groupId", t.getGroupId() == null ? "" : t.getGroupId());
                    item.put("personal", t.isPersonal());
                    item.put("status", t.getStatus().name());
                    item.put("priority", t.getPriority().name());
                    item.put("deadline", t.getDeadline());
                    item.put("label", t.getLabel() == null ? "" : t.getLabel());
                    return item;
                })
                .collect(Collectors.toList());

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", all.size());
        summary.put("todo", todo);
        summary.put("inProgress", inProgress);
        summary.put("done", done);
        summary.put("overdue", overdue);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", summary);
        result.put("byMonth", byMonth);
        result.put("roadmap", roadmap);

        return result;
    }

    // =========================
    // COMMENTS & SUBMISSION
    // =========================

    public Task addComment(
            String groupId,
            String taskId,
            String authorId,
            String authorName,
            String content,
            String parentId
    ) {
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Nội dung bình luận không được để trống");
        }

        Task task = getOne(groupId, taskId);

        Task.Comment newComment = Task.Comment.builder()
                .id(UUID.randomUUID().toString())
                .authorId(authorId)
                .authorName(authorName)
                .content(content.trim())
                .createdAt(Instant.now())
                .updatedAt(null)
                .edited(false)
                .replies(new ArrayList<>())
                .build();

        if (parentId == null || parentId.isBlank()) {
            task.getComments().add(newComment);
        } else {
            Task.Comment parent = findCommentRecursive(task.getComments(), parentId);
            if (parent == null) {
                throw new RuntimeException("Không tìm thấy bình luận cha để trả lời");
            }
            parent.getReplies().add(newComment);
        }

        Task saved = taskRepo.save(task);

        if (task.getAssigneeId() != null && !task.getAssigneeId().equals(authorId)) {
            notifService.send(
                    task.getAssigneeId(),
                    "Task có bình luận mới",
                    authorName + " vừa bình luận trong task: " + task.getTitle(),
                    "TASK_COMMENT",
                    "/groups/" + groupId + "/kanban/" + task.getId()
            );
        }

        return saved;
    }

    public Task updateComment(
            String groupId,
            String taskId,
            String commentId,
            String userId,
            String content
    ) {
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Nội dung bình luận không được để trống");
        }

        Task task = getOne(groupId, taskId);
        Task.Comment comment = findCommentRecursive(task.getComments(), commentId);

        if (comment == null) {
            throw new RuntimeException("Không tìm thấy bình luận");
        }

        if (!canModifyComment(task, comment, userId)) {
            throw new RuntimeException("Bạn không có quyền sửa bình luận này");
        }

        comment.setContent(content.trim());
        comment.setEdited(true);
        comment.setUpdatedAt(Instant.now());

        return taskRepo.save(task);
    }

    public void deleteComment(
            String groupId,
            String taskId,
            String commentId,
            String userId
    ) {
        Task task = getOne(groupId, taskId);
        Task.Comment comment = findCommentRecursive(task.getComments(), commentId);

        if (comment == null) {
            throw new RuntimeException("Không tìm thấy bình luận");
        }

        if (!canModifyComment(task, comment, userId)) {
            throw new RuntimeException("Bạn không có quyền xoá bình luận này");
        }

        boolean removed = removeCommentRecursive(task.getComments(), commentId);
        if (!removed) {
            throw new RuntimeException("Không thể xoá bình luận");
        }

        taskRepo.save(task);
    }

    public Task submitWork(
            String groupId,
            String taskId,
            String userId,
            String userName,
            String answerText,
            List<Map<String, Object>> files,
            List<Map<String, Object>> images
    ) {
        Task task = getOne(groupId, taskId);

        Task.Submission submission = Optional.ofNullable(task.getSubmission())
                .orElse(Task.Submission.builder().build());

        submission.setAnswerText(answerText);
        submission.setFiles(toAttachments(files));
        submission.setImages(toAttachments(images));
        submission.setSubmitted(true);
        submission.setSubmittedAt(Instant.now());
        submission.setSubmittedById(userId);
        submission.setSubmittedByName(userName);

        task.setSubmission(submission);

        Task saved = taskRepo.save(task);

        if (task.getCreatedById() != null && !task.getCreatedById().equals(userId)) {
            notifService.send(
                    task.getCreatedById(),
                    "Có bài nộp mới",
                    userName + " đã nộp task: " + task.getTitle(),
                    "TASK_SUBMISSION",
                    "/groups/" + groupId + "/kanban/" + task.getId()
            );
        }

        return saved;
    }

    public Task clearSubmission(String groupId, String taskId) {
        Task task = getOne(groupId, taskId);
        task.setSubmission(Task.Submission.builder().build());
        return taskRepo.save(task);
    }

    // =========================
    // HELPERS
    // =========================

    @SafeVarargs
    private final List<Task> mergeAndSortTasks(List<Task>... taskLists) {
        Map<String, Task> mergedMap = new LinkedHashMap<>();

        for (List<Task> list : taskLists) {
            if (list == null) continue;
            for (Task t : list) {
                mergedMap.put(t.getId(), t);
            }
        }

        List<Task> merged = new ArrayList<>(mergedMap.values());
        merged.sort((a, b) -> {
            Instant ta = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
            Instant tb = b.getUpdatedAt() != null ? b.getUpdatedAt() : b.getCreatedAt();
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return tb.compareTo(ta);
        });

        return merged;
    }

    private Task.Status defaultStatus(Task.Status status) {
        return status == null ? Task.Status.TODO : status;
    }

    private Task.Priority defaultPriority(Task.Priority priority) {
        return priority == null ? Task.Priority.MEDIUM : priority;
    }

    private String defaultLabelColor(String color) {
        return (color == null || color.isBlank()) ? "#6366f1" : color;
    }

    private String blankToNull(String v) {
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    private String findUserFullName(String userId) {
        if (userId == null || userId.isBlank()) return null;
        return userRepo.findById(userId)
                .map(u -> u.getFullName())
                .orElse(null);
    }

    private boolean canModifyComment(Task task, Task.Comment comment, String userId) {
        return Objects.equals(comment.getAuthorId(), userId)
                || Objects.equals(task.getCreatedById(), userId);
    }

    private Task.Comment findCommentRecursive(List<Task.Comment> comments, String commentId) {
        if (comments == null) return null;

        for (Task.Comment c : comments) {
            if (Objects.equals(c.getId(), commentId)) return c;
            Task.Comment child = findCommentRecursive(c.getReplies(), commentId);
            if (child != null) return child;
        }
        return null;
    }

    private boolean removeCommentRecursive(List<Task.Comment> comments, String commentId) {
        if (comments == null) return false;

        Iterator<Task.Comment> iterator = comments.iterator();
        while (iterator.hasNext()) {
            Task.Comment c = iterator.next();
            if (Objects.equals(c.getId(), commentId)) {
                iterator.remove();
                return true;
            }
            if (removeCommentRecursive(c.getReplies(), commentId)) {
                return true;
            }
        }
        return false;
    }

    private List<Task.Attachment> toAttachments(List<Map<String, Object>> raw) {
        if (raw == null) return Collections.emptyList();

        List<Task.Attachment> result = new ArrayList<>();
        for (Map<String, Object> item : raw) {
            result.add(Task.Attachment.builder()
                    .name(asString(item.get("name")))
                    .url(asString(item.get("url")))
                    .type(asString(item.get("type")))
                    .size(asLong(item.get("size")))
                    .build());
        }
        return result;
    }

    private String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }
}