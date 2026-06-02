package com.studymate.service;

import com.studymate.model.Notification;
import com.studymate.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifRepo;

    public void send(String userId, String title, String body, String type) {
        send(userId, title, body, type, null, null);
    }

    public void send(String userId, String title, String body, String type, String link) {
        send(userId, title, body, type, link, null);
    }

    public void send(String userId, String title, String body, String type, String link, String actorId) {
        if (userId == null || (actorId != null && userId.equals(actorId))) return;
        notifRepo.save(Notification.builder()
                .userId(userId)
                .title(title)
                .body(body)
                .type(type)
                .link(link)
                .actorId(actorId)
                .build());
    }

    public void send(
            String userId,
            String title,
            String body,
            String type,
            String link,
            String actorId,
            String actorName,
            String actorAvatar,
            String groupId,
            String sourceId,
            String sourceType
    ) {
        if (userId == null || (actorId != null && userId.equals(actorId))) return;
        notifRepo.save(Notification.builder()
                .userId(userId)
                .title(title)
                .body(body)
                .type(type)
                .link(link)
                .actorId(actorId)
                .actorName(actorName)
                .actorAvatar(actorAvatar)
                .groupId(groupId)
                .sourceId(sourceId)
                .sourceType(sourceType)
                .build());
    }

    public void broadcast(List<String> userIds, String title, String body) {
        broadcast(userIds, title, body, null);
    }

    public void broadcast(List<String> userIds, String title, String body, String senderId) {
        if (userIds == null) return;
        userIds.forEach(uid -> {
            if (senderId == null || !uid.equals(senderId)) {
                send(uid, title, body, "BROADCAST", null, senderId);
            }
        });
    }

    public Page<Notification> getByUser(String userId, int page) {
        return notifRepo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, 20));
    }

    public long countUnread(String userId) {
        return notifRepo.countByUserIdAndReadFalse(userId);
    }

    public void markRead(String notifId) {
        notifRepo.findById(notifId).ifPresent(n -> {
            n.setRead(true);
            notifRepo.save(n);
        });
    }

    public void markAllRead(String userId) {
        var list = notifRepo.findByUserIdOrderByCreatedAtDesc(userId, Pageable.unpaged());
        list.forEach(n -> n.setRead(true));
        notifRepo.saveAll(list.getContent());
    }

    public void markChatNotificationsReadByActor(String userId, String actorId, List<String> types) {
        var list = notifRepo.findByUserIdAndActorIdAndReadFalseAndTypeIn(userId, actorId, types);
        if (list == null || list.isEmpty()) return;

        list.forEach(n -> n.setRead(true));
        notifRepo.saveAll(list);
    }

    public void markChatNotificationsReadByGroup(String userId, String groupId, List<String> types) {
        var list = notifRepo.findByUserIdAndGroupIdAndReadFalseAndTypeIn(userId, groupId, types);
        if (list == null || list.isEmpty()) return;

        list.forEach(n -> n.setRead(true));
        notifRepo.saveAll(list);
    }
}