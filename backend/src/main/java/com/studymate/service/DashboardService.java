package com.studymate.service;

import com.studymate.model.Group;
import com.studymate.model.Post;
import com.studymate.model.Task;
import com.studymate.model.StudyDocument;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.PostRepository;
import com.studymate.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final GroupRepository groupRepo;
    private final TaskRepository taskRepo;
    private final PostRepository postRepo;
    private final NotificationService notifService;
    private final MongoTemplate mongoTemplate;

    public Map<String, Object> getStats(String userId) {
        List<Group> groups = groupRepo.findByMemberId(userId);
        List<String> groupIds = groups.stream().map(Group::getId).toList();

        List<Task> assignedGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndAssigneeIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> createdGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndCreatedByIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> personalTasks = taskRepo.findByPersonalTrueAndCreatedByIdOrderByCreatedAtDesc(userId);

        List<Task> allMyTasks = mergeTasks(assignedGroupTasks, createdGroupTasks, personalTasks);

        long activeTaskCount = allMyTasks.stream()
                .filter(t -> t.getStatus() == Task.Status.IN_PROGRESS)
                .count();

        Instant now = Instant.now();
        Instant next3Days = now.plusSeconds(3 * 24 * 60 * 60L);

        long upcomingDeadlineCount = allMyTasks.stream()
                .filter(t -> t.getDeadline() != null)
                .filter(t -> t.getStatus() != Task.Status.DONE)
                .filter(t -> !t.getDeadline().isBefore(now))
                .filter(t -> !t.getDeadline().isAfter(next3Days))
                .count();

        long documentCount = countDocumentsInMyGroups(groupIds);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalGroups", groups.size());
        stats.put("groupCount", groups.size());

        stats.put("activeTasks", activeTaskCount);
        stats.put("activeTaskCount", activeTaskCount);

        stats.put("upcomingDeadlineCount", upcomingDeadlineCount);
        stats.put("nearDeadlineTaskCount", upcomingDeadlineCount);

        stats.put("unreadNotifs", notifService.countUnread(userId));
        stats.put("totalPosts", postRepo.findByAuthorIdOrderByCreatedAtDesc(userId).size());

        stats.put("documentCount", documentCount);

        // Chưa có bảng kết quả quiz thật thì để null
        stats.put("quizAccuracy", null);

        return stats;
    }

    public List<Map<String, Object>> getActivity(String userId) {
        List<Group> groups = groupRepo.findByMemberId(userId);
        List<String> groupIds = groups.stream().map(Group::getId).toList();

        Map<String, String> groupNameMap = groups.stream()
                .collect(Collectors.toMap(Group::getId, Group::getName, (a, b) -> a));

        List<ActivityRow> rows = new ArrayList<>();

        // 1) Task hoàn thành gần đây của user
        List<Task> assignedGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndAssigneeIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> createdGroupTasks = groupIds.isEmpty()
                ? new ArrayList<>()
                : taskRepo.findByGroupIdInAndCreatedByIdOrderByCreatedAtDesc(groupIds, userId);

        List<Task> personalTasks = taskRepo.findByPersonalTrueAndCreatedByIdOrderByCreatedAtDesc(userId);

        List<Task> allMyTasks = mergeTasks(assignedGroupTasks, createdGroupTasks, personalTasks);

        allMyTasks.stream()
                .filter(t -> t.getStatus() == Task.Status.DONE)
                .limit(8)
                .forEach(t -> {
                    Instant ts = t.getUpdatedAt() != null ? t.getUpdatedAt() : t.getCreatedAt();
                    String html;

                    if (t.isPersonal()) {
                        html = "Bạn đã hoàn thành task cá nhân <b>" + esc(t.getTitle()) + "</b>.";
                    } else {
                        String groupName = groupNameMap.getOrDefault(t.getGroupId(), "nhóm học tập");
                        html = "Bạn đã hoàn thành task <b>" + esc(t.getTitle()) + "</b> ở nhóm <b>" + esc(groupName) + "</b>.";
                    }

                    rows.add(new ActivityRow(
                            ts,
                            activityMap("TASK_COMPLETE", "✓", "#22c55e", html, ts)
                    ));
                });

        // 2) Tài liệu đã upload gần đây trong nhóm của user
        if (!groupIds.isEmpty()) {
            Query q = new Query(Criteria.where("groupId").in(groupIds))
                    .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                    .limit(8);

            List<StudyDocument> docs = mongoTemplate.find(q, StudyDocument.class);

            for (StudyDocument d : docs) {
                Instant ts = d.getCreatedAt();
                String groupName = groupNameMap.getOrDefault(d.getGroupId(), "nhóm học tập");

                String uploader = d.getUploaderName() == null || d.getUploaderName().isBlank()
                        ? "Một thành viên"
                        : d.getUploaderName();

                String html = "<b>" + esc(uploader) + "</b> đã tải lên tài liệu <b>"
                        + esc(d.getName()) + "</b> vào nhóm <b>" + esc(groupName) + "</b>.";

                rows.add(new ActivityRow(
                        ts,
                        activityMap("DOCUMENT_UPLOAD", "↑", "#f59e0b", html, ts)
                ));
            }
        }

        // 3) Bài viết gần đây của user
        postRepo.findByAuthorIdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(6)
                .forEach(p -> {
                    Instant ts = p.getCreatedAt();
                    String title = p.getTitle() == null || p.getTitle().isBlank() ? "bài viết mới" : p.getTitle();

                    String html = "Bạn đã đăng bài <b>" + esc(title) + "</b>.";

                    rows.add(new ActivityRow(
                            ts,
                            activityMap("POST_CREATE", "📝", "#6366f1", html, ts)
                    ));
                });

        rows.sort((a, b) -> {
            if (a.createdAt() == null && b.createdAt() == null) return 0;
            if (a.createdAt() == null) return 1;
            if (b.createdAt() == null) return -1;
            return b.createdAt().compareTo(a.createdAt());
        });

        return rows.stream()
                .limit(10)
                .map(ActivityRow::payload)
                .toList();
    }

    public Object getFeed(int page) {
        return postRepo.findByPublishedTrue(
                PageRequest.of(page, 10, Sort.by("createdAt").descending())
        );
    }

    private long countDocumentsInMyGroups(List<String> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) return 0;

        Query q = new Query(Criteria.where("groupId").in(groupIds));
        return mongoTemplate.count(q, StudyDocument.class);
    }

    @SafeVarargs
    private final List<Task> mergeTasks(List<Task>... lists) {
        Map<String, Task> map = new LinkedHashMap<>();
        for (List<Task> list : lists) {
            if (list == null) continue;
            for (Task t : list) {
                map.put(t.getId(), t);
            }
        }
        return new ArrayList<>(map.values());
    }

    private Map<String, Object> activityMap(
            String type,
            String icon,
            String color,
            String html,
            Instant createdAt
    ) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("icon", icon);
        m.put("color", color);
        m.put("html", html);
        m.put("createdAt", createdAt != null ? createdAt.toString() : null);
        return m;
    }

    private String esc(String s) {
        if (s == null) return "";
        return s
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private record ActivityRow(Instant createdAt, Map<String, Object> payload) {}
}