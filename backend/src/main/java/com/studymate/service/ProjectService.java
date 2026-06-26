package com.studymate.service;

import com.studymate.model.Group;
import com.studymate.model.Project;
import com.studymate.model.Task;
import com.studymate.model.TaskProgress;
import com.studymate.model.User;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.ProjectRepository;
import com.studymate.repository.TaskProgressRepository;
import com.studymate.repository.TaskRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Comparator;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TaskProgressRepository taskProgressRepository;
    private final GroupRepository groupRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public Project createProject(String groupId, String name, String description, String startDateStr, String endDateStr, List<String> memberIds, String createdBy) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Instant startDate = startDateStr != null ? LocalDate.parse(startDateStr, formatter).atStartOfDay(ZoneId.systemDefault()).toInstant() : Instant.now();
        Instant endDate = endDateStr != null ? LocalDate.parse(endDateStr, formatter).atStartOfDay(ZoneId.systemDefault()).toInstant() : null;

        Project project = Project.builder()
                .groupId(groupId)
                .name(name)
                .description(description)
                .createdBy(createdBy)
                .status(Project.ProjectStatus.PLANNING)
                .startDate(startDate)
                .endDate(endDate)
                .memberIds(memberIds != null ? memberIds : List.of())
                .createdAt(Instant.now())
                .build();

        project = projectRepository.save(project);

        return project;
    }

    public Project getProjectByIdAndGroupId(String projectId, String groupId) {
        return projectRepository.findByIdAndGroupId(projectId, groupId)
                .orElseThrow(() -> new RuntimeException("Dự án không tồn tại"));
    }

    public Project updateProject(String projectId, String groupId, String name, String description, String startDateStr, String endDateStr, String statusStr, List<String> memberIds) {
        Project project = getProjectByIdAndGroupId(projectId, groupId);

        if (name != null) project.setName(name);
        if (description != null) project.setDescription(description);
        if (memberIds != null) project.setMemberIds(memberIds);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        if (startDateStr != null) {
            project.setStartDate(LocalDate.parse(startDateStr, formatter).atStartOfDay(ZoneId.systemDefault()).toInstant());
        }
        if (endDateStr != null) {
            project.setEndDate(LocalDate.parse(endDateStr, formatter).atStartOfDay(ZoneId.systemDefault()).toInstant());
        }
        if (statusStr != null) {
            project.setStatus(Project.ProjectStatus.valueOf(statusStr));
        }

        return projectRepository.save(project);
    }

    public void deleteProject(String projectId, String groupId) {
        Project project = getProjectByIdAndGroupId(projectId, groupId);
        
        // Delete all tasks associated with this project
        List<Task> tasks = taskRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        taskRepository.deleteAll(tasks);
        
        // Delete task progress records
        List<TaskProgress> progressList = taskProgressRepository.findByProjectId(projectId);
        taskProgressRepository.deleteAll(progressList);
        
        // Delete the project
        projectRepository.delete(project);
    }

    public Project completeProject(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Dự án không tồn tại"));

        if (project.getStatus() == Project.ProjectStatus.COMPLETED) {
            throw new RuntimeException("Dự án đã hoàn thành");
        }

        project.setStatus(Project.ProjectStatus.COMPLETED);
        project.setCompletedAt(Instant.now());
        if (project.getEndDate() == null) {
            project.setEndDate(Instant.now());
        }

        return projectRepository.save(project);
    }

    public Project cancelProject(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Dự án không tồn tại"));

        if (project.getStatus() == Project.ProjectStatus.CANCELLED) {
            throw new RuntimeException("Dự án đã bị hủy");
        }

        project.setStatus(Project.ProjectStatus.CANCELLED);
        if (project.getEndDate() == null) {
            project.setEndDate(Instant.now());
        }

        return projectRepository.save(project);
    }

    public List<Project> getGroupProjects(String groupId) {
        return projectRepository.findByGroupId(groupId);
    }

    public Project getActiveProject(String groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhom khong ton tai"));

        if (group.getActiveProjectId() != null && !group.getActiveProjectId().isBlank()) {
            return getProjectByIdAndGroupId(group.getActiveProjectId(), groupId);
        }

        return projectRepository.findByGroupId(groupId).stream()
                .filter(project -> project.getStatus() == Project.ProjectStatus.ACTIVE
                        || project.getStatus() == Project.ProjectStatus.IN_PROGRESS
                        || project.getStatus() == Project.ProjectStatus.PLANNING)
                .max(Comparator.comparing(
                        Project::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ))
                .orElse(null);
    }
    public Map<String, Object> getProjectProgress(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Dự án không tồn tại"));

        // Calculate timeline info
        Instant now = Instant.now();
        long totalDays = 0;
        long daysLeft = 0;
        long daysPassed = 0;
        double elapsedPercent = 0;

        // Get task statistics
        long totalTasks = taskRepository.countByProjectId(projectId);
        long doneTasks = taskRepository.countByProjectIdAndStatus(projectId, Task.Status.DONE);
        long inProgressTasks = taskRepository.countByProjectIdAndStatus(projectId, Task.Status.IN_PROGRESS);
        long todoTasks = taskRepository.countByProjectIdAndStatus(projectId, Task.Status.TODO);
        Long overdueTasksCount = taskRepository.countOverdueByProjectId(projectId, now);
        long overdueTasks = overdueTasksCount != null ? overdueTasksCount : 0;
        double completionPercent = totalTasks > 0 ? (doneTasks * 100.0 / totalTasks) : 0;

        if (project.getStartDate() != null && project.getEndDate() != null) {
            totalDays = ChronoUnit.DAYS.between(project.getStartDate(), project.getEndDate());
            daysLeft = ChronoUnit.DAYS.between(now, project.getEndDate());
            daysPassed = ChronoUnit.DAYS.between(project.getStartDate(), now);
            elapsedPercent = totalDays > 0 ? (daysPassed * 100.0 / totalDays) : 0;
        }

        // Determine schedule status
        String scheduleStatus;
        if (totalTasks == 0) {
            scheduleStatus = "NO_TASKS";
        } else if (completionPercent >= 100) {
            scheduleStatus = "COMPLETED";
        } else if (completionPercent + 10 < elapsedPercent) {
            scheduleStatus = "BEHIND";
        } else if (completionPercent >= elapsedPercent) {
            scheduleStatus = "ON_TRACK";
        } else {
            scheduleStatus = "AHEAD";
        }

        // Get member progress
        List<Task> allTasks = taskRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        Map<String, List<Task>> tasksByAssignee = allTasks.stream()
                .filter(t -> t.getAssigneeId() != null)
                .collect(Collectors.groupingBy(Task::getAssigneeId));

        // Get project member info for role determination
        String projectCreator = project.getCreatedBy();

        List<Map<String, Object>> members = tasksByAssignee.entrySet().stream()
                .map(entry -> {
                    String userId = entry.getKey();
                    List<Task> userTasks = entry.getValue();
                    long userTotal = userTasks.size();
                    long userDone = userTasks.stream().filter(t -> t.getStatus() == Task.Status.DONE).count();
                    long userInProgress = userTasks.stream().filter(t -> t.getStatus() == Task.Status.IN_PROGRESS).count();
                    long userTodo = userTasks.stream().filter(t -> t.getStatus() == Task.Status.TODO).count();
                    long userOverdue = userTasks.stream()
                            .filter(t -> t.getStatus() != Task.Status.DONE && t.getDeadline() != null && t.getDeadline().isBefore(now))
                            .count();
                    double userCompletionPercent = userTotal > 0 ? (userDone * 100.0 / userTotal) : 0;

                    // Get user avatar
                    String avatar = userRepository.findById(userId)
                            .map(User::getAvatar)
                            .orElse(null);

                    // Determine role
                    String role = "MEMBER";
                    if (userId.equals(projectCreator)) {
                        role = "LEADER";
                    }

                    // Determine status label
                    String statusLabel;
                    if (userCompletionPercent == 0) {
                        statusLabel = "Chưa bắt đầu";
                    } else if (userOverdue > 0) {
                        statusLabel = "Chậm tiến độ";
                    } else if (userCompletionPercent >= 100) {
                        statusLabel = "Hoàn thành";
                    } else {
                        statusLabel = "Đúng tiến độ";
                    }

                    Map<String, Object> memberMap = new java.util.HashMap<>();
                    memberMap.put("userId", userId);
                    memberMap.put("fullName", userTasks.get(0).getAssigneeName());
                    memberMap.put("avatar", avatar);
                    memberMap.put("role", role);
                    memberMap.put("totalTasks", userTotal);
                    memberMap.put("doneTasks", userDone);
                    memberMap.put("inProgressTasks", userInProgress);
                    memberMap.put("todoTasks", userTodo);
                    memberMap.put("overdueTasks", userOverdue);
                    memberMap.put("completionPercent", userCompletionPercent);
                    memberMap.put("statusLabel", statusLabel);
                    return memberMap;
                })
                .collect(Collectors.toList());

        // Get urgent tasks
        List<Map<String, Object>> urgentTasks = allTasks.stream()
                .filter(t -> t.getStatus() != Task.Status.DONE)
                .filter(t -> t.getDeadline() != null)
                .filter(t -> {
                    long daysUntilDeadline = ChronoUnit.DAYS.between(now, t.getDeadline());
                    return daysUntilDeadline <= 3;
                })
                .map(t -> {
                    Map<String, Object> taskMap = new java.util.HashMap<>();
                    taskMap.put("id", t.getId());
                    taskMap.put("title", t.getTitle());
                    taskMap.put("assigneeName", t.getAssigneeName());
                    taskMap.put("assigneeId", t.getAssigneeId());
                    taskMap.put("deadline", t.getDeadline());
                    taskMap.put("priority", t.getPriority().toString());
                    taskMap.put("status", t.getStatus().toString());
                    long daysUntilDeadline = ChronoUnit.DAYS.between(now, t.getDeadline());
                    taskMap.put("urgency", daysUntilDeadline < 0 ? "OVERDUE" : "DUE_SOON");
                    return taskMap;
                })
                .collect(Collectors.toList());

        // Generate time series data
        List<Map<String, Object>> timeSeries = new java.util.ArrayList<>();
        if (project.getStartDate() != null && project.getEndDate() != null) {
            Instant currentDate = project.getStartDate();
            while (!currentDate.isAfter(project.getEndDate())) {
                double plannedPercent = totalDays > 0 ? (ChronoUnit.DAYS.between(project.getStartDate(), currentDate) * 100.0 / totalDays) : 0;
                double actualPercent = 0; // Would need historical data for actual progress over time
                Map<String, Object> dataPoint = new java.util.HashMap<>();
                dataPoint.put("date", currentDate.toString());
                dataPoint.put("plannedPercent", plannedPercent);
                dataPoint.put("actualPercent", actualPercent);
                timeSeries.add(dataPoint);
                currentDate = currentDate.plus(1, ChronoUnit.DAYS);
            }
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("project", project);
        result.put("summary", Map.of(
                "totalTasks", totalTasks,
                "doneTasks", doneTasks,
                "inProgressTasks", inProgressTasks,
                "todoTasks", todoTasks,
                "overdueTasks", overdueTasks,
                "completionPercent", completionPercent,
                "scheduleStatus", scheduleStatus
        ));
        result.put("timeline", Map.of(
                "totalDays", totalDays,
                "daysLeft", daysLeft,
                "daysPassed", daysPassed,
                "elapsedPercent", elapsedPercent
        ));
        result.put("members", members);
        result.put("urgentTasks", urgentTasks);
        result.put("timeSeries", timeSeries);
        return result;
    }

    public byte[] exportProjectProgress(String projectId) {
        Map<String, Object> progress = getProjectProgress(projectId);
        Project project = (Project) progress.get("project");
        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) progress.get("summary");
        @SuppressWarnings("unchecked")
        Map<String, Object> timeline = (Map<String, Object>) progress.get("timeline");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> members = (List<Map<String, Object>>) progress.get("members");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> urgentTasks = (List<Map<String, Object>>) progress.get("urgentTasks");

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            // Sheet 1: Overview
            Sheet overviewSheet = workbook.createSheet("Tổng quan");
            Row headerRow = overviewSheet.createRow(0);
            createCell(headerRow, 0, "Thông tin dự án", getHeaderStyle(workbook));
            createCell(headerRow, 1, "", getHeaderStyle(workbook));

            int rowNum = 1;
            createRow(overviewSheet, rowNum++, "Tên dự án", project.getName());
            createRow(overviewSheet, rowNum++, "Mô tả", project.getDescription());
            createRow(overviewSheet, rowNum++, "Ngày bắt đầu", formatDate(project.getStartDate()));
            createRow(overviewSheet, rowNum++, "Ngày kết thúc", formatDate(project.getEndDate()));
            createRow(overviewSheet, rowNum++, "Trạng thái", project.getStatus().toString());
            rowNum++;
            createRow(overviewSheet, rowNum++, "Tổng số task", summary.get("totalTasks"));
            createRow(overviewSheet, rowNum++, "Hoàn thành", summary.get("doneTasks"));
            createRow(overviewSheet, rowNum++, "Đang làm", summary.get("inProgressTasks"));
            createRow(overviewSheet, rowNum++, "Chưa làm", summary.get("todoTasks"));
            createRow(overviewSheet, rowNum++, "Quá hạn", summary.get("overdueTasks"));
            createRow(overviewSheet, rowNum++, "Hoàn thành (%)", summary.get("completionPercent") + "%");
            createRow(overviewSheet, rowNum++, "Trạng thái tiến độ", summary.get("scheduleStatus"));
            rowNum++;
            createRow(overviewSheet, rowNum++, "Tổng số ngày", timeline.get("totalDays"));
            createRow(overviewSheet, rowNum++, "Ngày còn lại", timeline.get("daysLeft"));
            createRow(overviewSheet, rowNum++, "Ngày đã qua", timeline.get("daysPassed"));
            createRow(overviewSheet, rowNum++, "Thời gian đã trôi qua (%)", timeline.get("elapsedPercent") + "%");

            autoSizeColumns(overviewSheet, 2);

            // Sheet 2: Member Progress
            Sheet memberSheet = workbook.createSheet("Tiến độ thành viên");
            Row memberHeader = memberSheet.createRow(0);
            createCell(memberHeader, 0, "Họ tên", getHeaderStyle(workbook));
            createCell(memberHeader, 1, "Vai trò", getHeaderStyle(workbook));
            createCell(memberHeader, 2, "Tổng task", getHeaderStyle(workbook));
            createCell(memberHeader, 3, "Hoàn thành", getHeaderStyle(workbook));
            createCell(memberHeader, 4, "Đang làm", getHeaderStyle(workbook));
            createCell(memberHeader, 5, "Chưa làm", getHeaderStyle(workbook));
            createCell(memberHeader, 6, "Quá hạn", getHeaderStyle(workbook));
            createCell(memberHeader, 7, "% Hoàn thành", getHeaderStyle(workbook));
            createCell(memberHeader, 8, "Trạng thái", getHeaderStyle(workbook));

            for (int i = 0; i < members.size(); i++) {
                Map<String, Object> member = members.get(i);
                Row row = memberSheet.createRow(i + 1);
                createCell(row, 0, member.get("fullName"));
                createCell(row, 1, member.get("role"));
                createCell(row, 2, member.get("totalTasks"));
                createCell(row, 3, member.get("doneTasks"));
                createCell(row, 4, member.get("inProgressTasks"));
                createCell(row, 5, member.get("todoTasks"));
                createCell(row, 6, member.get("overdueTasks"));
                createCell(row, 7, String.format("%.1f%%", (Double) member.get("completionPercent")));
                createCell(row, 8, member.get("statusLabel"));
            }

            autoSizeColumns(memberSheet, 9);

            // Sheet 3: Urgent Tasks
            Sheet urgentSheet = workbook.createSheet("Task cần chú ý");
            Row urgentHeader = urgentSheet.createRow(0);
            createCell(urgentHeader, 0, "Tên task", getHeaderStyle(workbook));
            createCell(urgentHeader, 1, "Người phụ trách", getHeaderStyle(workbook));
            createCell(urgentHeader, 2, "Deadline", getHeaderStyle(workbook));
            createCell(urgentHeader, 3, "Mức độ", getHeaderStyle(workbook));
            createCell(urgentHeader, 4, "Ưu tiên", getHeaderStyle(workbook));

            for (int i = 0; i < urgentTasks.size(); i++) {
                Map<String, Object> task = urgentTasks.get(i);
                Row row = urgentSheet.createRow(i + 1);
                createCell(row, 0, task.get("title"));
                createCell(row, 1, task.get("assigneeName"));
                createCell(row, 2, formatDate((Instant) task.get("deadline")));
                createCell(row, 3, task.get("urgency"));
                createCell(row, 4, task.get("priority"));
            }

            autoSizeColumns(urgentSheet, 5);

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi xuất file Excel", e);
        }
    }

    private void createRow(Sheet sheet, int rowNum, String label, Object value) {
        Row row = sheet.createRow(rowNum);
        createCell(row, 0, label);
        createCell(row, 1, value != null ? value.toString() : "");
    }

    private void createCell(Row row, int col, String value) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
    }

    private void createCell(Row row, int col, Object value) {
        Cell cell = row.createCell(col);
        if (value instanceof Number) {
            cell.setCellValue(((Number) value).doubleValue());
        } else if (value != null) {
            cell.setCellValue(value.toString());
        } else {
            cell.setCellValue("");
        }
    }

    private void createCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private CellStyle getHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private String formatDate(Instant instant) {
        if (instant == null) return "";
        return LocalDate.ofInstant(instant, ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private void autoSizeColumns(Sheet sheet, int numColumns) {
        for (int i = 0; i < numColumns; i++) {
            sheet.autoSizeColumn(i);
        }
    }
}
