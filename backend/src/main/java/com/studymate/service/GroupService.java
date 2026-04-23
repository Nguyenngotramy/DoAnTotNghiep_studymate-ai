package com.studymate.service;

import com.studymate.dto.request.GroupRequest;
import com.studymate.model.Group;
import com.studymate.model.User;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.TaskRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final TaskRepository taskRepo;
    private final NotificationService notificationService;

    public Group create(String userId, GroupRequest req) {
        User user = userRepo.findById(userId).orElseThrow();

        String code = generateCode();
        while (groupRepo.existsByInviteCode(code)) {
            code = generateCode();
        }

        Group.GroupMember leader = Group.GroupMember.builder()
                .userId(userId)
                .fullName(user.getFullName())
                .role(Group.Role.LEADER)
                .joinedAt(Instant.now())
                .build();

        Group group = Group.builder()
                .name(req.getName())
                .description(req.getDescription())
                .subject(req.getSubject())
                .coverColor(req.getCoverColor())
                .publicVisible(req.isPublicVisible())
                .requireApproval(req.isRequireApproval())
                .requirePostApproval(req.isRequirePostApproval())
                .inviteCode(code)
                .members(new ArrayList<>(List.of(leader)))
                .joinRequests(new ArrayList<>())
                .build();

        return groupRepo.save(group);
    }

    public Group update(String groupId, String leaderId, GroupRequest req) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        validateLeader(group, leaderId);

        group.setName(req.getName());
        group.setDescription(req.getDescription());
        group.setSubject(req.getSubject());
        group.setCoverColor(req.getCoverColor());
        group.setPublicVisible(req.isPublicVisible());
        group.setRequireApproval(req.isRequireApproval());
        group.setRequirePostApproval(req.isRequirePostApproval());

        return groupRepo.save(group);
    }

    public List<Group> getMyGroups(String userId) {
        return groupRepo.findByMemberId(userId);
    }

    public List<Group> getPublicGroups() {
        return groupRepo.findByPublicVisibleTrueOrderByCreatedAtDesc();
    }

    public Group getById(String groupId, String userId) {
        Group g = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        boolean isMember = safeMembers(g).stream()
                .anyMatch(m -> m.getUserId().equals(userId));

        if (!isMember) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này");
        }

        return g;
    }

    public Map<String, Object> join(String userId, String inviteCode) {
        User user = userRepo.findById(userId).orElseThrow();

        Group group = groupRepo.findByInviteCode(inviteCode)
                .orElseThrow(() -> new RuntimeException("Mã mời không hợp lệ"));

        boolean alreadyMember = safeMembers(group).stream()
                .anyMatch(m -> m.getUserId().equals(userId));

        if (alreadyMember) {
            return Map.of(
                    "joined", true,
                    "pendingApproval", false,
                    "alreadyMember", true,
                    "group", group,
                    "message", "Bạn đã là thành viên nhóm này"
            );
        }

        List<Group.JoinRequest> requests = safeJoinRequests(group);

        Group.JoinRequest existingPending = requests.stream()
                .filter(r -> userId.equals(r.getUserId()))
                .findFirst()
                .orElse(null);

        if (existingPending != null) {
            return Map.of(
                    "joined", false,
                    "pendingApproval", true,
                    "alreadyRequested", true,
                    "message", "Yêu cầu tham gia của bạn đang chờ duyệt"
            );
        }

        if (group.isRequireApproval()) {
            Group.JoinRequest request = Group.JoinRequest.builder()
                    .userId(userId)
                    .fullName(user.getFullName())
                    .status(Group.Status.PENDING)
                    .requestedAt(Instant.now())
                    .build();

            requests.add(request);
            groupRepo.save(group);

            Group.GroupMember leader = safeMembers(group).stream()
                    .filter(m -> m.getRole() == Group.Role.LEADER)
                    .findFirst()
                    .orElse(null);

            if (leader != null) {
                notificationService.send(
                        leader.getUserId(),
                        "Yêu cầu tham gia nhóm mới",
                        user.getFullName() + " muốn tham gia nhóm " + group.getName(),
                        "GROUP_JOIN_REQUEST",
                        "/groups"
                );
            }

            return Map.of(
                    "joined", false,
                    "pendingApproval", true,
                    "message", "Đã gửi yêu cầu tham gia, chờ trưởng nhóm duyệt"
            );
        }

        Group.GroupMember member = Group.GroupMember.builder()
                .userId(userId)
                .fullName(user.getFullName())
                .role(Group.Role.MEMBER)
                .joinedAt(Instant.now())
                .build();

        safeMembers(group).add(member);
        Group saved = groupRepo.save(group);

        notificationService.send(
                userId,
                "Tham gia nhóm thành công",
                "Bạn đã tham gia nhóm " + group.getName(),
                "GROUP_JOINED",
                "/groups"
        );

        return Map.of(
                "joined", true,
                "pendingApproval", false,
                "alreadyMember", false,
                "group", saved,
                "message", "Tham gia nhóm thành công"
        );
    }

    public List<Group.JoinRequest> getPendingJoinRequests(String groupId, String leaderId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        validateLeader(group, leaderId);

        return safeJoinRequests(group).stream().collect(Collectors.toList());
    }

    public void approveJoinRequest(String groupId, String leaderId, String targetUserId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        validateLeader(group, leaderId);

        List<Group.JoinRequest> requests = safeJoinRequests(group);
        List<Group.GroupMember> members = safeMembers(group);

        Group.JoinRequest request = requests.stream()
                .filter(r -> targetUserId.equals(r.getUserId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu tham gia"));

        boolean alreadyMember = members.stream()
                .anyMatch(m -> targetUserId.equals(m.getUserId()));

        if (!alreadyMember) {
            members.add(
                    Group.GroupMember.builder()
                            .userId(request.getUserId())
                            .fullName(request.getFullName())
                            .role(Group.Role.MEMBER)
                            .joinedAt(Instant.now())
                            .build()
            );
        }

        requests.removeIf(r -> targetUserId.equals(r.getUserId()));
        groupRepo.save(group);

        notificationService.send(
                targetUserId,
                "Yêu cầu tham gia được chấp nhận",
                "Bạn đã được duyệt vào nhóm " + group.getName(),
                "GROUP_REQUEST_APPROVED",
                "/groups"
        );
    }

    public void rejectJoinRequest(String groupId, String leaderId, String targetUserId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        validateLeader(group, leaderId);

        List<Group.JoinRequest> requests = safeJoinRequests(group);

        boolean existed = requests.removeIf(r -> targetUserId.equals(r.getUserId()));

        if (!existed) {
            throw new RuntimeException("Không tìm thấy yêu cầu tham gia");
        }

        groupRepo.save(group);

        notificationService.send(
                targetUserId,
                "Yêu cầu tham gia bị từ chối",
                "Trưởng nhóm đã từ chối yêu cầu vào nhóm " + group.getName(),
                "GROUP_REQUEST_REJECTED",
                "/groups"
        );
    }

    public void leave(String groupId, String userId) {
        Group group = groupRepo.findById(groupId).orElseThrow();

        boolean isLeader = safeMembers(group).stream()
                .anyMatch(m -> userId.equals(m.getUserId()) && m.getRole() == Group.Role.LEADER);

        if (isLeader) {
            throw new RuntimeException("Trưởng nhóm không thể tự rời nhóm. Hãy chuyển quyền trước nếu cần.");
        }

        safeMembers(group).removeIf(m -> userId.equals(m.getUserId()));
        groupRepo.save(group);
    }

    public void removeMember(String groupId, String leaderId, String targetId) {
        Group group = groupRepo.findById(groupId).orElseThrow();
        validateLeaderOrDeputy(group, leaderId);

        boolean actorIsDeputy = safeMembers(group).stream()
                .anyMatch(m -> leaderId.equals(m.getUserId()) && m.getRole() == Group.Role.DEPUTY);

        Group.GroupMember targetMember = safeMembers(group).stream()
                .filter(m -> targetId.equals(m.getUserId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thành viên trong nhóm"));

        if (targetMember.getRole() == Group.Role.LEADER) {
            throw new RuntimeException("Không thể xoá trưởng nhóm khỏi nhóm");
        }

        if (actorIsDeputy && targetMember.getRole() == Group.Role.DEPUTY) {
            throw new RuntimeException("Nhóm phó không thể xoá nhóm phó khác");
        }

        boolean removed = safeMembers(group).removeIf(m -> targetId.equals(m.getUserId()));

        if (!removed) {
            throw new RuntimeException("Không tìm thấy thành viên trong nhóm");
        }

        groupRepo.save(group);

        notificationService.send(
                targetId,
                "Bạn đã bị xoá khỏi nhóm",
                "Bạn đã bị xoá khỏi nhóm " + group.getName(),
                "GROUP_MEMBER_REMOVED",
                "/groups"
        );
    }

    public void changeMemberRole(String groupId, String actorId, String targetUserId, String roleValue) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        Group.GroupMember actor = safeMembers(group).stream()
                .filter(m -> actorId.equals(m.getUserId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Bạn không thuộc nhóm này"));

        if (actor.getRole() != Group.Role.LEADER) {
            throw new RuntimeException("Chỉ trưởng nhóm mới được đổi vai trò");
        }

        Group.GroupMember target = safeMembers(group).stream()
                .filter(m -> targetUserId.equals(m.getUserId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thành viên"));

        if (target.getRole() == Group.Role.LEADER) {
            throw new RuntimeException("Không thể đổi vai trò của trưởng nhóm");
        }

        if (actorId.equals(targetUserId)) {
            throw new RuntimeException("Không thể tự đổi vai trò của chính mình");
        }

        Group.Role newRole;
        try {
            newRole = Group.Role.valueOf((roleValue == null ? "" : roleValue.trim().toUpperCase()));
        } catch (Exception e) {
            throw new RuntimeException("Vai trò không hợp lệ");
        }

        if (newRole != Group.Role.DEPUTY && newRole != Group.Role.MEMBER && newRole != Group.Role.VIEWER) {
            throw new RuntimeException("Chỉ được đổi sang DEPUTY, MEMBER hoặc VIEWER");
        }

        target.setRole(newRole);
        groupRepo.save(group);

        String roleText = switch (newRole) {
            case DEPUTY -> "nhóm phó";
            case VIEWER -> "người xem";
            default -> "thành viên";
        };

        notificationService.send(
                targetUserId,
                "Vai trò trong nhóm đã thay đổi",
                "Vai trò của bạn trong nhóm " + group.getName() + " đã được đổi thành " + roleText,
                "GROUP_ROLE_CHANGED",
                "/groups/" + groupId
        );
    }

    public int getProgress(String groupId) {
        long total = taskRepo.countByGroupId(groupId);
        if (total == 0) return 0;

        long done = taskRepo.countByGroupIdAndStatus(
                groupId,
                com.studymate.model.Task.Status.DONE
        );

        return (int) (done * 100 / total);
    }

    private void validateLeader(Group group, String leaderId) {
        boolean isLeader = safeMembers(group).stream()
                .anyMatch(m -> leaderId.equals(m.getUserId()) && m.getRole() == Group.Role.LEADER);

        if (!isLeader) {
            throw new RuntimeException("Chỉ trưởng nhóm mới có quyền thực hiện thao tác này");
        }
    }

    private void validateLeaderOrDeputy(Group group, String userId) {
        boolean allowed = safeMembers(group).stream()
                .anyMatch(m -> userId.equals(m.getUserId())
                        && (m.getRole() == Group.Role.LEADER || m.getRole() == Group.Role.DEPUTY));

        if (!allowed) {
            throw new RuntimeException("Chỉ trưởng nhóm hoặc nhóm phó mới có quyền thực hiện thao tác này");
        }
    }

    private List<Group.GroupMember> safeMembers(Group group) {
        if (group.getMembers() == null) {
            group.setMembers(new ArrayList<>());
        }
        return group.getMembers();
    }

    private List<Group.JoinRequest> safeJoinRequests(Group group) {
        if (group.getJoinRequests() == null) {
            group.setJoinRequests(new ArrayList<>());
        }
        return group.getJoinRequests();
    }

    private String generateCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(6);
        Random rand = new Random();

        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(rand.nextInt(chars.length())));
        }

        return sb.toString();
    }
}