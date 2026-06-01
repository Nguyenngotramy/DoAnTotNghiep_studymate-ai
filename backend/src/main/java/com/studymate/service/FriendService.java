package com.studymate.service;

import com.studymate.model.Friendship;
import com.studymate.model.User;
import com.studymate.repository.FriendshipRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendshipRepository friendRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    public List<User> suggestions(String userId, String search, int size) {
        int safeSize = normalizeSize(size);

        Set<String> excludeIds = getFriendIds(userId);
        excludeIds.add(userId);

        friendRepo.findByRequesterIdOrReceiverId(userId, userId)
                .forEach(friendship -> {
                    excludeIds.add(friendship.getRequesterId());
                    excludeIds.add(friendship.getReceiverId());
                });

        String q = normalizeSearch(search);

        return userRepo.findAll()
                .stream()
                .filter(user -> user.getId() != null)
                .filter(user -> !excludeIds.contains(user.getId()))
                .filter(user -> !user.isLocked())
                .filter(user -> user.getRole() != User.Role.ADMIN)
                .filter(user -> matchesSearch(user, q))
                .limit(safeSize)
                .collect(Collectors.toList());
    }

    public Friendship sendRequest(String requesterId, String receiverId) {
        if (requesterId == null || receiverId == null) {
            throw new RuntimeException("Dữ liệu người dùng không hợp lệ");
        }

        if (requesterId.equals(receiverId)) {
            throw new RuntimeException("Không thể kết bạn với chính mình");
        }

        Optional<Friendship> existing = friendRepo.findBetween(requesterId, receiverId);

        if (existing.isPresent()) {
            Friendship friendship = existing.get();

            if (friendship.getStatus() == Friendship.Status.ACCEPTED) {
                throw new RuntimeException("Hai người đã là bạn bè");
            }

            if (friendship.getStatus() == Friendship.Status.PENDING) {
                throw new RuntimeException("Đã gửi lời mời kết bạn");
            }

            throw new RuntimeException("Không thể gửi lời mời kết bạn");
        }

        User requester = userRepo.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người gửi lời mời"));

        User receiver = userRepo.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận lời mời"));

        if (receiver.isLocked()) {
            throw new RuntimeException("Không thể kết bạn với tài khoản đang bị khóa");
        }

        Friendship saved = friendRepo.save(
                Friendship.builder()
                        .requesterId(requesterId)
                        .receiverId(receiverId)
                        .status(Friendship.Status.PENDING)
                        .build()
        );

        notificationService.send(
                receiverId,
                "Lời mời kết bạn mới",
                requester.getFullName() + " đã gửi lời mời kết bạn cho bạn",
                "FRIEND_REQUEST",
                "/friends"
        );

        return saved;
    }

    public Friendship accept(String receiverId, String requesterId) {
        Friendship friendship = friendRepo.findBetween(requesterId, receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời kết bạn"));

        if (friendship.getStatus() != Friendship.Status.PENDING) {
            throw new RuntimeException("Lời mời này không còn ở trạng thái chờ");
        }

        if (!friendship.getReceiverId().equals(receiverId)) {
            throw new RuntimeException("Bạn không có quyền chấp nhận lời mời này");
        }

        User receiver = userRepo.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

        friendship.setStatus(Friendship.Status.ACCEPTED);
        Friendship saved = friendRepo.save(friendship);

        notificationService.send(
                requesterId,
                "Lời mời kết bạn được chấp nhận",
                receiver.getFullName() + " đã chấp nhận lời mời kết bạn của bạn",
                "FRIEND_ACCEPTED",
                "/friends"
        );

        return saved;
    }

    public void reject(String receiverId, String requesterId) {
        friendRepo.findBetween(requesterId, receiverId).ifPresent(friendship -> {
            if (!friendship.getReceiverId().equals(receiverId)) {
                throw new RuntimeException("Bạn không có quyền từ chối lời mời này");
            }

            User receiver = userRepo.findById(receiverId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

            friendRepo.delete(friendship);

            notificationService.send(
                    requesterId,
                    "Lời mời kết bạn bị từ chối",
                    receiver.getFullName() + " đã từ chối lời mời kết bạn của bạn",
                    "FRIEND_REJECTED",
                    "/friends"
            );
        });
    }

    public void remove(String userId, String friendId) {
        friendRepo.findBetween(userId, friendId)
                .ifPresent(friendRepo::delete);
    }

    public List<User> getFriends(String userId, String search, int size) {
        int safeSize = normalizeSize(size);
        String q = normalizeSearch(search);

        Set<String> friendIds = getFriendIds(userId);

        if (friendIds.isEmpty()) {
            return new ArrayList<>();
        }

        return userRepo.findAllById(friendIds)
                .stream()
                .filter(user -> user.getId() != null)
                .filter(user -> !user.isLocked())
                .filter(user -> matchesSearch(user, q))
                .limit(safeSize)
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getPending(String userId, int size) {
        int safeSize = normalizeSize(size);

        List<Map<String, Object>> result = new ArrayList<>();

        List<Friendship> incoming = friendRepo.findByReceiverIdAndStatus(
                userId,
                Friendship.Status.PENDING
        );

        for (Friendship friendship : incoming) {
            Map<String, Object> item = toPendingItem(friendship, userId, "INCOMING");
            result.add(item);
        }

        List<Friendship> outgoing = friendRepo.findByRequesterIdAndStatus(
                userId,
                Friendship.Status.PENDING
        );

        for (Friendship friendship : outgoing) {
            Map<String, Object> item = toPendingItem(friendship, userId, "OUTGOING");
            result.add(item);
        }

        result.sort((a, b) -> {
            Object aDate = a.get("createdAt");
            Object bDate = b.get("createdAt");

            if (aDate == null && bDate == null) return 0;
            if (aDate == null) return 1;
            if (bDate == null) return -1;

            return String.valueOf(bDate).compareTo(String.valueOf(aDate));
        });

        return result.stream()
                .limit(safeSize)
                .collect(Collectors.toList());
    }

    public Map<String, String> getStatus(String userId, String targetId) {
        return friendRepo.findBetween(userId, targetId)
                .map(friendship -> Map.of("status", friendship.getStatus().name()))
                .orElse(Map.of("status", "NONE"));
    }

    private Map<String, Object> toPendingItem(
            Friendship friendship,
            String currentUserId,
            String direction
    ) {
        Map<String, Object> item = new HashMap<>();

        item.put("id", friendship.getId());
        item.put("requesterId", friendship.getRequesterId());
        item.put("receiverId", friendship.getReceiverId());
        item.put("status", friendship.getStatus());
        item.put("createdAt", friendship.getCreatedAt());
        item.put("direction", direction);

        String otherUserId = "INCOMING".equals(direction)
                ? friendship.getRequesterId()
                : friendship.getReceiverId();

        item.put("otherUserId", otherUserId);

        userRepo.findById(friendship.getRequesterId())
                .ifPresent(user -> item.put("requester", user));

        userRepo.findById(friendship.getReceiverId())
                .ifPresent(user -> item.put("receiver", user));

        userRepo.findById(otherUserId)
                .ifPresent(user -> item.put("otherUser", user));

        return item;
    }

    private Set<String> getFriendIds(String userId) {
        return friendRepo.findFriends(userId)
                .stream()
                .map(friendship ->
                        friendship.getRequesterId().equals(userId)
                                ? friendship.getReceiverId()
                                : friendship.getRequesterId()
                )
                .collect(Collectors.toSet());
    }

    private int normalizeSize(int size) {
        return Math.min(Math.max(size, 1), 10000);
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.trim().toLowerCase();
    }

    private boolean matchesSearch(User user, String q) {
        if (q == null || q.isBlank()) {
            return true;
        }

        String fullName = user.getFullName() == null
                ? ""
                : user.getFullName().toLowerCase();

        String email = user.getEmail() == null
                ? ""
                : user.getEmail().toLowerCase();

        String studentCode = user.getStudentCode() == null
                ? ""
                : user.getStudentCode().toLowerCase();

        String school = user.getSchool() == null
                ? ""
                : user.getSchool().toLowerCase();

        return fullName.contains(q)
                || email.contains(q)
                || studentCode.contains(q)
                || school.contains(q);
    }
}