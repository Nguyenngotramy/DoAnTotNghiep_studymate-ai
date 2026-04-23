package com.studymate.service;

import com.studymate.model.*;
import com.studymate.repository.*;
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

    public List<User> suggestions(String userId) {
        Set<String> excludeIds = getFriendIds(userId);
        excludeIds.add(userId);

        friendRepo.findByRequesterIdOrReceiverId(userId, userId)
                .forEach(f -> {
                    excludeIds.add(f.getRequesterId());
                    excludeIds.add(f.getReceiverId());
                });

        return userRepo.findAll().stream()
                .filter(u -> !excludeIds.contains(u.getId()))
                .limit(20)
                .collect(Collectors.toList());
    }

    public Friendship sendRequest(String requesterId, String receiverId) {
        if (requesterId.equals(receiverId)) {
            throw new RuntimeException("Không thể kết bạn với chính mình");
        }

        var existing = friendRepo.findBetween(requesterId, receiverId);
        if (existing.isPresent()) {
            throw new RuntimeException("Đã gửi lời mời hoặc đã là bạn bè");
        }

        User requester = userRepo.findById(requesterId).orElseThrow();
        User receiver = userRepo.findById(receiverId).orElseThrow();

        Friendship saved = friendRepo.save(Friendship.builder()
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(Friendship.Status.PENDING)
                .build());

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
        Friendship f = friendRepo.findBetween(requesterId, receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời kết bạn"));

        if (!f.getReceiverId().equals(receiverId)) {
            throw new RuntimeException("Bạn không có quyền chấp nhận lời mời này");
        }

        User receiver = userRepo.findById(receiverId).orElseThrow();
        f.setStatus(Friendship.Status.ACCEPTED);
        Friendship saved = friendRepo.save(f);

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
        friendRepo.findBetween(requesterId, receiverId).ifPresent(f -> {
            User receiver = userRepo.findById(receiverId).orElseThrow();
            friendRepo.delete(f);

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
        friendRepo.findBetween(userId, friendId).ifPresent(friendRepo::delete);
    }

    public List<User> getFriends(String userId) {
        Set<String> friendIds = getFriendIds(userId);
        if (friendIds.isEmpty()) return new ArrayList<>();
        return userRepo.findAllById(friendIds);
    }

    public List<Map<String, Object>> getPending(String userId) {
        List<Friendship> pending = friendRepo.findByReceiverIdAndStatus(userId, Friendship.Status.PENDING);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Friendship f : pending) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", f.getId());
            item.put("requesterId", f.getRequesterId());
            item.put("receiverId", f.getReceiverId());
            item.put("status", f.getStatus());
            item.put("createdAt", f.getCreatedAt());

            userRepo.findById(f.getRequesterId()).ifPresent(u -> item.put("requester", u));
            result.add(item);
        }

        return result;
    }

    public Map<String, String> getStatus(String userId, String targetId) {
        return friendRepo.findBetween(userId, targetId)
                .map(f -> Map.of("status", f.getStatus().name()))
                .orElse(Map.of("status", "NONE"));
    }

    private Set<String> getFriendIds(String userId) {
        return friendRepo.findFriends(userId).stream()
                .map(f -> f.getRequesterId().equals(userId) ? f.getReceiverId() : f.getRequesterId())
                .collect(Collectors.toSet());
    }
}