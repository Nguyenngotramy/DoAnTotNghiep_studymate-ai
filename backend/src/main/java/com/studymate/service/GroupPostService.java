package com.studymate.service;

import com.studymate.dto.request.GroupPostRequest;
import com.studymate.model.Group;
import com.studymate.model.GroupPost;
import com.studymate.model.User;
import com.studymate.repository.GroupPostRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupPostService {

    private final GroupPostRepository groupPostRepo;
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    public List<GroupPost> getByGroup(String groupId, String userId) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        List<GroupPost> posts = groupPostRepo.findByGroupIdOrderByCreatedAtDesc(groupId);

        boolean isLeader = isLeader(group, userId);

        return posts.stream()
                .filter(post -> {
                    if (post.getHiddenByUserIds() != null && post.getHiddenByUserIds().contains(userId)) {
                        return false;
                    }

                    if (isLeader) {
                        return post.getStatus() != GroupPost.PostStatus.REJECTED;
                    }

                    return post.getStatus() == GroupPost.PostStatus.APPROVED;
                })
                .collect(Collectors.toList());
    }

    public List<GroupPost> getPendingPosts(String groupId, String userId) {
        Group group = findGroup(groupId);
        validateLeader(group, userId);

        return groupPostRepo.findByGroupIdAndStatusOrderByCreatedAtDesc(
                groupId,
                GroupPost.PostStatus.PENDING
        );
    }

    public List<GroupPost> getReportedPosts(String groupId, String userId) {
        Group group = findGroup(groupId);
        validateLeader(group, userId);

        return groupPostRepo.findByGroupIdOrderByCreatedAtDesc(groupId).stream()
                .filter(post -> post.getReports() != null && !post.getReports().isEmpty())
                .collect(Collectors.toList());
    }

    public GroupPost create(String groupId, String userId, GroupPostRequest req) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        User user = userRepo.findById(userId).orElseThrow();

        List<GroupPost.Attachment> attachments = req.getAttachments() == null
                ? new ArrayList<>()
                : req.getAttachments().stream()
                .map(a -> GroupPost.Attachment.builder()
                        .name(a.getName())
                        .url(a.getUrl())
                        .type(a.getType())
                        .sizeKb(a.getSizeKb())
                        .build())
                .collect(Collectors.toList());

        GroupPost.PostStatus status = group.isRequirePostApproval()
                ? GroupPost.PostStatus.PENDING
                : GroupPost.PostStatus.APPROVED;

        GroupPost post = GroupPost.builder()
                .groupId(groupId)
                .authorId(userId)
                .authorName(user.getFullName())
                .authorAvatar(user.getAvatar())
                .content(req.getContent())
                .imageUrls(req.getImageUrls() == null ? new ArrayList<>() : req.getImageUrls())
                .videoUrl(req.getVideoUrl())
                .attachments(attachments)
                .likedBy(new HashSet<>())
                .comments(new ArrayList<>())
                .hiddenByUserIds(new HashSet<>())
                .reports(new ArrayList<>())
                .status(status)
                .approvedAt(status == GroupPost.PostStatus.APPROVED ? Instant.now() : null)
                .approvedBy(status == GroupPost.PostStatus.APPROVED ? userId : null)
                .build();

        GroupPost saved = groupPostRepo.save(post);

        if (group.isRequirePostApproval()) {
            List<String> leaderIds = getLeaderIds(group);
            for (String leaderId : leaderIds) {
                if (!leaderId.equals(userId)) {
                    notificationService.send(
                            leaderId,
                            "Có bài viết mới chờ duyệt",
                            user.getFullName() + " vừa đăng một bài viết cần duyệt trong nhóm " + group.getName(),
                            "GROUP_POST_PENDING",
                            "/groups/" + groupId + "?postId=" + saved.getId()
                    );
                }
            }
        }

        return saved;
    }

    public GroupPost approvePost(String groupId, String postId, String userId) {
        Group group = findGroup(groupId);
        validateLeader(group, userId);

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        post.setStatus(GroupPost.PostStatus.APPROVED);
        post.setApprovedAt(Instant.now());
        post.setApprovedBy(userId);
        post.setRejectedAt(null);
        post.setRejectedBy(null);
        post.setRejectedReason(null);

        GroupPost saved = groupPostRepo.save(post);

        if (post.getAuthorId() != null && !post.getAuthorId().equals(userId)) {
            notificationService.send(
                    post.getAuthorId(),
                    "Bài viết của bạn đã được duyệt",
                    "Bài viết của bạn trong nhóm " + group.getName() + " đã được trưởng nhóm duyệt",
                    "GROUP_POST_APPROVED",
                    "/groups/" + groupId + "?postId=" + post.getId()
            );
        }

        return saved;
    }

    public GroupPost rejectPost(String groupId, String postId, String userId, String reason) {
        Group group = findGroup(groupId);
        validateLeader(group, userId);

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        post.setStatus(GroupPost.PostStatus.REJECTED);
        post.setRejectedAt(Instant.now());
        post.setRejectedBy(userId);
        post.setRejectedReason(reason == null ? "" : reason.trim());

        GroupPost saved = groupPostRepo.save(post);

        if (post.getAuthorId() != null && !post.getAuthorId().equals(userId)) {
            notificationService.send(
                    post.getAuthorId(),
                    "Bài viết của bạn đã bị từ chối",
                    "Bài viết của bạn trong nhóm " + group.getName() + " chưa được duyệt",
                    "GROUP_POST_REJECTED",
                    "/groups/" + groupId
            );
        }

        return saved;
    }

    public GroupPost hide(String groupId, String postId, String userId) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        if (post.getHiddenByUserIds() == null) {
            post.setHiddenByUserIds(new HashSet<>());
        }

        post.getHiddenByUserIds().add(userId);
        return groupPostRepo.save(post);
    }

    public GroupPost report(String groupId, String postId, String userId, String reason) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        User user = userRepo.findById(userId).orElseThrow();

        if (post.getReports() == null) {
            post.setReports(new ArrayList<>());
        }

        boolean alreadyReported = post.getReports().stream()
                .anyMatch(r -> userId.equals(r.getUserId()));

        if (alreadyReported) {
            throw new RuntimeException("Bạn đã báo cáo bài viết này rồi");
        }

        post.getReports().add(
                GroupPost.PostReport.builder()
                        .id(UUID.randomUUID().toString())
                        .userId(userId)
                        .fullName(user.getFullName())
                        .reason(reason == null || reason.trim().isEmpty() ? "Nội dung không phù hợp" : reason.trim())
                        .createdAt(Instant.now())
                        .build()
        );

        GroupPost saved = groupPostRepo.save(post);

        for (String leaderId : getLeaderIds(group)) {
            if (!leaderId.equals(userId)) {
                notificationService.send(
                        leaderId,
                        "Bài viết bị báo cáo",
                        user.getFullName() + " vừa báo cáo một bài viết trong nhóm " + group.getName(),
                        "GROUP_POST_REPORTED",
                        "/groups/" + groupId + "?postId=" + post.getId()
                );
            }
        }

        return saved;
    }

    public GroupPost like(String groupId, String postId, String userId) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        if (post.getStatus() != GroupPost.PostStatus.APPROVED) {
            throw new RuntimeException("Không thể tương tác với bài viết chưa được duyệt");
        }

        if (post.getLikedBy() == null) {
            post.setLikedBy(new HashSet<>());
        }

        boolean added;
        if (post.getLikedBy().contains(userId)) {
            post.getLikedBy().remove(userId);
            added = false;
        } else {
            post.getLikedBy().add(userId);
            added = true;
        }

        GroupPost saved = groupPostRepo.save(post);

        if (added && post.getAuthorId() != null && !post.getAuthorId().equals(userId)) {
            User actor = userRepo.findById(userId).orElseThrow();
            notificationService.send(
                    post.getAuthorId(),
                    "Bài viết nhóm có lượt thích mới",
                    actor.getFullName() + " đã thích bài viết của bạn trong nhóm " + group.getName(),
                    "GROUP_POST_LIKED",
                    "/groups/" + groupId + "?postId=" + post.getId()
            );
        }

        return saved;
    }

    public GroupPost addComment(String groupId, String postId, String userId, String content) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("Nội dung bình luận không được trống");
        }

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        if (post.getStatus() != GroupPost.PostStatus.APPROVED) {
            throw new RuntimeException("Không thể bình luận bài viết chưa được duyệt");
        }

        User user = userRepo.findById(userId).orElseThrow();

        if (post.getComments() == null) {
            post.setComments(new ArrayList<>());
        }

        String commentId = UUID.randomUUID().toString();

        post.getComments().add(
                GroupPost.Comment.builder()
                        .id(commentId)
                        .authorId(userId)
                        .authorName(user.getFullName())
                        .authorAvatar(user.getAvatar())
                        .content(content.trim())
                        .createdAt(Instant.now())
                        .replies(new ArrayList<>())
                        .build()
        );

        GroupPost saved = groupPostRepo.save(post);

        if (post.getAuthorId() != null && !post.getAuthorId().equals(userId)) {
            notificationService.send(
                    post.getAuthorId(),
                    "Bài viết nhóm có bình luận mới",
                    user.getFullName() + " đã bình luận bài viết của bạn trong nhóm " + group.getName(),
                    "GROUP_POST_COMMENTED",
                    "/groups/" + groupId + "?postId=" + post.getId() + "&commentId=" + commentId
            );
        }

        return saved;
    }

    public GroupPost replyComment(String groupId, String postId, String commentId, String userId, String content) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("Nội dung phản hồi không được trống");
        }

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        if (post.getStatus() != GroupPost.PostStatus.APPROVED) {
            throw new RuntimeException("Không thể phản hồi bài viết chưa được duyệt");
        }

        User user = userRepo.findById(userId).orElseThrow();

        GroupPost.Comment comment = post.getComments().stream()
                .filter(c -> commentId.equals(c.getId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bình luận"));

        if (comment.getReplies() == null) {
            comment.setReplies(new ArrayList<>());
        }

        String replyId = UUID.randomUUID().toString();

        comment.getReplies().add(
                GroupPost.Reply.builder()
                        .id(replyId)
                        .authorId(userId)
                        .authorName(user.getFullName())
                        .authorAvatar(user.getAvatar())
                        .content(content.trim())
                        .createdAt(Instant.now())
                        .build()
        );

        GroupPost saved = groupPostRepo.save(post);

        if (comment.getAuthorId() != null && !comment.getAuthorId().equals(userId)) {
            notificationService.send(
                    comment.getAuthorId(),
                    "Bình luận của bạn có phản hồi mới",
                    user.getFullName() + " đã trả lời bình luận của bạn trong nhóm " + group.getName(),
                    "GROUP_COMMENT_REPLIED",
                    "/groups/" + groupId + "?postId=" + post.getId() + "&commentId=" + commentId + "&replyId=" + replyId
            );
        }

        return saved;
    }

    public void delete(String groupId, String postId, String userId) {
        Group group = findGroup(groupId);
        validateMember(group, userId);

        GroupPost post = findPost(postId);
        validatePostBelongsToGroup(groupId, post);

        boolean isLeader = isLeader(group, userId);
        boolean isOwner = userId.equals(post.getAuthorId());

        if (!isLeader && !isOwner) {
            throw new RuntimeException("Bạn không có quyền xoá bài viết này");
        }

        groupPostRepo.delete(post);
    }

    private Group findGroup(String groupId) {
        return groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));
    }

    private GroupPost findPost(String postId) {
        return groupPostRepo.findById(postId)
                .orElseThrow(() -> new RuntimeException("Bài viết không tồn tại"));
    }

    private void validateMember(Group group, String userId) {
        boolean isMember = group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m -> userId.equals(m.getUserId()));

        if (!isMember) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này");
        }
    }

    private void validateLeader(Group group, String userId) {
        validateMember(group, userId);

        if (!isLeader(group, userId)) {
            throw new RuntimeException("Chỉ trưởng nhóm mới có quyền thực hiện thao tác này");
        }
    }

    private boolean isLeader(Group group, String userId) {
        return group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m -> userId.equals(m.getUserId()) && m.getRole() == Group.Role.LEADER);
    }

    private List<String> getLeaderIds(Group group) {
        if (group.getMembers() == null) return new ArrayList<>();

        return group.getMembers().stream()
                .filter(m -> m.getRole() == Group.Role.LEADER)
                .map(Group.GroupMember::getUserId)
                .collect(Collectors.toList());
    }

    private void validatePostBelongsToGroup(String groupId, GroupPost post) {
        if (!groupId.equals(post.getGroupId())) {
            throw new RuntimeException("Bài viết không thuộc nhóm này");
        }
    }
}