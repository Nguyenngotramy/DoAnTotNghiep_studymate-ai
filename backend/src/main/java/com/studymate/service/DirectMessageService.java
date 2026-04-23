package com.studymate.service;

import com.studymate.model.DirectMessage;
import com.studymate.model.User;
import com.studymate.repository.DirectMessageRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DirectMessageService {

    private static final List<String> DM_NOTIFICATION_TYPES =
            List.of("DM", "CHAT", "CHAT_MESSAGE");

    private final DirectMessageRepository dmRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messaging;
    private final WebClient.Builder webClient;
    private final NotificationService notificationService;

    @Value("${app.ml-service.url}")
    private String mlUrl;

    public Page<DirectMessage> getConversation(String u1, String u2, int page) {
        return dmRepo.findConversation(
                u1,
                u2,
                PageRequest.of(page, 30, Sort.by("createdAt").descending())
        );
    }

    public List<DirectMessage> getPinnedConversation(String u1, String u2) {
        return dmRepo.findPinnedConversation(
                u1,
                u2,
                Sort.by(Sort.Direction.DESC, "updatedAt", "createdAt")
        );
    }

    public DirectMessage send(
            String senderId,
            String receiverId,
            String content,
            String type,
            List<DirectMessage.Attachment> attachments,
            DirectMessage.ReplyPreview replyTo
    ) {
        User sender = userRepo.findById(senderId).orElseThrow();

        DirectMessage.Type dmType;
        try {
            dmType = DirectMessage.Type.valueOf(
                    (type == null ? "TEXT" : type).trim().toUpperCase()
            );
        } catch (Exception e) {
            dmType = DirectMessage.Type.TEXT;
        }

        String safeContent = content == null ? "" : content.trim();
        List<DirectMessage.Attachment> safeAttachments =
                attachments == null ? new ArrayList<>() : attachments;

        DirectMessage msg = DirectMessage.builder()
                .senderId(senderId)
                .receiverId(receiverId)
                .senderName(sender.getFullName())
                .senderAvatar(sender.getAvatar())
                .content(safeContent)
                .type(dmType)
                .attachments(safeAttachments)
                .replyTo(replyTo)
                .recalled(false)
                .build();

        DirectMessage saved = dmRepo.save(msg);

        messaging.convertAndSendToUser(receiverId, "/queue/dm", saved);
        messaging.convertAndSendToUser(senderId, "/queue/dm", saved);

        String preview = buildPreview(saved);
        notificationService.send(
                receiverId,
                "Bạn có tin nhắn mới từ " + sender.getFullName(),
                preview,
                "DM",
                "/inbox/" + senderId,
                senderId,
                sender.getFullName(),
                sender.getAvatar(),
                null,
                saved.getId(),
                "DM"
        );

        return saved;
    }

    public DirectMessage send(
            String senderId,
            String receiverId,
            String content,
            String type,
            List<DirectMessage.Attachment> attachments
    ) {
        return send(senderId, receiverId, content, type, attachments, null);
    }

    public DirectMessage send(String senderId, String receiverId, String content, String type) {
        return send(senderId, receiverId, content, type, new ArrayList<>(), null);
    }

    public DirectMessage askAI(String senderId, String receiverId, String question) {
        String answer;
        try {
            var res = webClient.build()
                    .post()
                    .uri(mlUrl + "/chat")
                    .bodyValue(Map.of("question", question))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            answer = res != null ? String.valueOf(res.get("answer")) : "AI đang bận, thử lại sau!";
        } catch (Exception e) {
            answer = "AI đang bận, thử lại sau!";
        }

        DirectMessage aiMsg = DirectMessage.builder()
                .senderId("AI")
                .receiverId(receiverId)
                .senderName("StudyMate AI")
                .senderAvatar(null)
                .content(answer)
                .type(DirectMessage.Type.AI)
                .attachments(new ArrayList<>())
                .recalled(false)
                .build();

        DirectMessage saved = dmRepo.save(aiMsg);
        messaging.convertAndSendToUser(receiverId, "/queue/dm", saved);
        messaging.convertAndSendToUser(senderId, "/queue/dm", saved);

        return saved;
    }

    public void markRead(String senderId, String receiverId) {
        Page<DirectMessage> page = dmRepo.findConversation(senderId, receiverId, Pageable.unpaged());
        List<DirectMessage> toUpdate = new ArrayList<>();

        for (DirectMessage m : page.getContent()) {
            if (receiverId.equals(m.getReceiverId()) && m.getReadAt() == null) {
                m.setReadAt(Instant.now());
                toUpdate.add(m);
            }
        }

        if (!toUpdate.isEmpty()) {
            dmRepo.saveAll(toUpdate);
        }

        notificationService.markChatNotificationsReadByActor(
                receiverId,
                senderId,
                DM_NOTIFICATION_TYPES
        );
    }

    public long countUnread(String senderId, String receiverId) {
        return dmRepo.countBySenderIdAndReceiverIdAndReadAtIsNull(senderId, receiverId);
    }

    public DirectMessage togglePin(String userId, String messageId, boolean pinned) {
        DirectMessage msg = dmRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        validateParticipant(userId, msg);

        if (msg.isRecalled()) {
            throw new RuntimeException("Không thể ghim tin nhắn đã thu hồi");
        }

        msg.setPinned(pinned);
        DirectMessage saved = dmRepo.save(msg);

        messaging.convertAndSendToUser(msg.getSenderId(), "/queue/dm-pin", saved);
        messaging.convertAndSendToUser(msg.getReceiverId(), "/queue/dm-pin", saved);

        return saved;
    }

    public DirectMessage react(String userId, String messageId, String emoji) {
        DirectMessage msg = dmRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        validateParticipant(userId, msg);

        if (msg.isRecalled()) {
            throw new RuntimeException("Không thể thả cảm xúc cho tin nhắn đã thu hồi");
        }

        if (emoji == null || emoji.isBlank()) {
            throw new RuntimeException("Emoji không hợp lệ");
        }

        List<DirectMessage.Reaction> reactions =
                msg.getReactions() == null ? new ArrayList<>() : msg.getReactions();

        DirectMessage.Reaction target = reactions.stream()
                .filter(r -> emoji.equals(r.getEmoji()))
                .findFirst()
                .orElse(null);

        if (target == null) {
            target = DirectMessage.Reaction.builder()
                    .emoji(emoji)
                    .userIds(new ArrayList<>())
                    .build();
            reactions.add(target);
        }

        List<String> userIds = target.getUserIds() == null ? new ArrayList<>() : target.getUserIds();

        if (userIds.contains(userId)) {
            userIds.remove(userId);
        } else {
            userIds.add(userId);
        }

        target.setUserIds(userIds);
        reactions.removeIf(r -> r.getUserIds() == null || r.getUserIds().isEmpty());

        msg.setReactions(reactions);
        DirectMessage saved = dmRepo.save(msg);

        messaging.convertAndSendToUser(msg.getSenderId(), "/queue/dm-react", saved);
        messaging.convertAndSendToUser(msg.getReceiverId(), "/queue/dm-react", saved);

        return saved;
    }

    public DirectMessage recall(String userId, String messageId) {
        DirectMessage msg = dmRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (!userId.equals(msg.getSenderId())) {
            throw new RuntimeException("Chỉ người gửi mới có thể thu hồi tin nhắn");
        }

        if (msg.isRecalled()) {
            return msg;
        }

        msg.setRecalled(true);
        msg.setRecalledAt(Instant.now());
        msg.setRecalledBy(userId);
        msg.setPinned(false);
        msg.setContent("");
        msg.setAttachments(new ArrayList<>());
        msg.setReactions(new ArrayList<>());
        msg.setReplyTo(null);

        DirectMessage saved = dmRepo.save(msg);

        messaging.convertAndSendToUser(msg.getSenderId(), "/queue/dm-recall", saved);
        messaging.convertAndSendToUser(msg.getReceiverId(), "/queue/dm-recall", saved);
        messaging.convertAndSendToUser(msg.getSenderId(), "/queue/dm", saved);
        messaging.convertAndSendToUser(msg.getReceiverId(), "/queue/dm", saved);

        return saved;
    }

    private String buildPreview(DirectMessage msg) {
        if (msg == null) return "Tin nhắn mới";
        if (msg.isRecalled()) return "Tin nhắn đã được thu hồi";

        if (msg.getContent() != null && !msg.getContent().isBlank()) {
            String text = msg.getContent().trim();
            return text.length() > 60 ? text.substring(0, 60) + "..." : text;
        }

        if (msg.getAttachments() != null && !msg.getAttachments().isEmpty()) {
            return "[Tệp đính kèm]";
        }

        return "Tin nhắn mới";
    }

    private void validateParticipant(String userId, DirectMessage msg) {
        boolean allowed =
                userId.equals(msg.getSenderId()) ||
                        userId.equals(msg.getReceiverId());

        if (!allowed) {
            throw new RuntimeException("Bạn không có quyền thao tác tin nhắn này");
        }
    }
}