package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.dto.PageResponse;
import com.studymate.model.ChatMessage;
import com.studymate.model.Group;
import com.studymate.model.Notification;
import com.studymate.model.User;
import com.studymate.repository.ChatMessageRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.NotificationRepository;
import com.studymate.repository.UserRepository;
import com.studymate.service.DocumentService;
import com.studymate.service.NotificationService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.security.Principal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private static final List<String> GROUP_CHAT_NOTIFICATION_TYPES =
            List.of("GROUP_CHAT", "CHAT_MESSAGE", "CHAT");

    private final ChatMessageRepository chatRepo;
    private final UserRepository userRepo;
    private final GroupRepository groupRepo;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messaging;
    private final WebClient.Builder webClientBuilder;
    private final NotificationService notifService;
    private final DocumentService documentService;

    @Value("${app.ml-service.url}")
    private String mlUrl;

    @GetMapping("/groups/{groupId}/chat")
    public ResponseEntity<?> history(
            @PathVariable String groupId,
            Authentication auth,
            @RequestParam(defaultValue = "0") int page
    ) {
        validateMember(groupId, auth.getName());

        var msgs = chatRepo.findByGroupIdOrderByCreatedAtDesc(
                groupId,
                PageRequest.of(page, 50)
        );

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(msgs)));
    }

    @GetMapping("/groups/{groupId}/chat/pinned")
    public ResponseEntity<?> pinned(
            @PathVariable String groupId,
            Authentication auth
    ) {
        validateMember(groupId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(
                chatRepo.findByGroupIdAndPinnedTrueOrderByCreatedAtDesc(groupId)
        ));
    }

    @PostMapping("/groups/{groupId}/chat/read")
    public ResponseEntity<?> markGroupChatRead(
            @PathVariable String groupId,
            Authentication auth
    ) {
        validateMember(groupId, auth.getName());

        List<Notification> unreadNotifications =
                notificationRepository.findByUserIdAndGroupIdAndReadFalseAndTypeIn(
                        auth.getName(),
                        groupId,
                        GROUP_CHAT_NOTIFICATION_TYPES
                );

        if (!unreadNotifications.isEmpty()) {
            unreadNotifications.forEach(n -> n.setRead(true));
            notificationRepository.saveAll(unreadNotifications);
        }

        return ResponseEntity.ok(ApiResponse.ok(null, "Đã đánh dấu tin nhắn nhóm là đã đọc"));
    }

    @PostMapping("/groups/{groupId}/chat")
    public ResponseEntity<?> sendMessageRest(
            @PathVariable String groupId,
            Authentication auth,
            @RequestBody SendMessageRequest body
    ) {
        ChatMessage msg = buildAndSaveUserMessage(
                groupId,
                auth.getName(),
                body.getContent(),
                body.getAttachments(),
                body.getMentionUserIds(),
                body.isMentionAll(),
                body.getReplyTo()
        );

        documentService.createFromChatAttachments(
                groupId,
                auth.getName(),
                msg.getSenderName(),
                msg.getId(),
                msg.getAttachments()
        );

        messaging.convertAndSend("/topic/group." + groupId, msg);
        notifyGroupChat(groupId, auth.getName(), msg, body.getMentionUserIds(), body.isMentionAll());

        return ResponseEntity.ok(ApiResponse.ok(msg, "Gửi tin nhắn thành công"));
    }

    @PostMapping("/groups/{groupId}/chat/{messageId}/pin")
    public ResponseEntity<?> pinMessage(
            @PathVariable String groupId,
            @PathVariable String messageId,
            Authentication auth
    ) {
        validateCanManagePins(groupId, auth.getName());

        ChatMessage msg = chatRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (!groupId.equals(msg.getGroupId())) {
            throw new RuntimeException("Tin nhắn không thuộc nhóm này");
        }

        if (msg.isRecalled()) {
            throw new RuntimeException("Không thể ghim tin nhắn đã thu hồi");
        }

        msg.setPinned(true);
        ChatMessage saved = chatRepo.save(msg);
        messaging.convertAndSend("/topic/group." + groupId, saved);

        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã ghim tin nhắn"));
    }

    @PostMapping("/groups/{groupId}/chat/{messageId}/unpin")
    public ResponseEntity<?> unpinMessage(
            @PathVariable String groupId,
            @PathVariable String messageId,
            Authentication auth
    ) {
        validateCanManagePins(groupId, auth.getName());

        ChatMessage msg = chatRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (!groupId.equals(msg.getGroupId())) {
            throw new RuntimeException("Tin nhắn không thuộc nhóm này");
        }

        msg.setPinned(false);
        ChatMessage saved = chatRepo.save(msg);
        messaging.convertAndSend("/topic/group." + groupId, saved);

        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã bỏ ghim tin nhắn"));
    }

    @PostMapping("/groups/{groupId}/chat/{messageId}/react")
    public ResponseEntity<?> reactMessage(
            @PathVariable String groupId,
            @PathVariable String messageId,
            Authentication auth,
            @RequestBody ReactRequest body
    ) {
        validateMember(groupId, auth.getName());

        String emoji = body.getEmoji() == null ? "" : body.getEmoji().trim();
        if (emoji.isEmpty()) {
            throw new RuntimeException("Emoji không được để trống");
        }

        ChatMessage msg = chatRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (!groupId.equals(msg.getGroupId())) {
            throw new RuntimeException("Tin nhắn không thuộc nhóm này");
        }

        if (msg.isRecalled()) {
            throw new RuntimeException("Không thể thả cảm xúc cho tin nhắn đã thu hồi");
        }

        if (msg.getReactions() == null) {
            msg.setReactions(new ArrayList<>());
        }

        ChatMessage.Reaction reaction = msg.getReactions().stream()
                .filter(r -> emoji.equals(r.getEmoji()))
                .findFirst()
                .orElse(null);

        if (reaction == null) {
            reaction = ChatMessage.Reaction.builder()
                    .emoji(emoji)
                    .userIds(new ArrayList<>())
                    .build();
            msg.getReactions().add(reaction);
        }

        if (reaction.getUserIds() == null) {
            reaction.setUserIds(new ArrayList<>());
        }

        if (reaction.getUserIds().contains(auth.getName())) {
            reaction.getUserIds().remove(auth.getName());
        } else {
            reaction.getUserIds().add(auth.getName());
        }

        msg.setReactions(
                msg.getReactions().stream()
                        .filter(r -> r.getUserIds() != null && !r.getUserIds().isEmpty())
                        .collect(Collectors.toList())
        );

        ChatMessage saved = chatRepo.save(msg);
        messaging.convertAndSend("/topic/group." + groupId, saved);

        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã cập nhật reaction"));
    }

    @PostMapping("/groups/{groupId}/chat/{messageId}/recall")
    public ResponseEntity<?> recallMessage(
            @PathVariable String groupId,
            @PathVariable String messageId,
            Authentication auth
    ) {
        validateMember(groupId, auth.getName());

        ChatMessage msg = chatRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));

        if (!groupId.equals(msg.getGroupId())) {
            throw new RuntimeException("Tin nhắn không thuộc nhóm này");
        }

        if (!auth.getName().equals(msg.getSenderId())) {
            throw new RuntimeException("Chỉ người gửi mới được thu hồi tin nhắn");
        }

        if (msg.isRecalled()) {
            return ResponseEntity.ok(ApiResponse.ok(msg, "Tin nhắn đã được thu hồi trước đó"));
        }

        msg.setRecalled(true);
        msg.setRecalledAt(Instant.now());
        msg.setRecalledBy(auth.getName());
        msg.setPinned(false);
        msg.setContent("");
        msg.setAttachments(new ArrayList<>());
        msg.setReactions(new ArrayList<>());
        msg.setReplyTo(null);

        ChatMessage saved = chatRepo.save(msg);
        messaging.convertAndSend("/topic/group." + groupId, saved);

        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã thu hồi tin nhắn"));
    }

    @PostMapping("/groups/{groupId}/chat/ai")
    public ResponseEntity<?> askAI(
            @PathVariable String groupId,
            Authentication auth,
            @RequestBody AskAIRequest body
    ) {
        validateMember(groupId, auth.getName());

        String question = body.getQuestion() == null ? "" : body.getQuestion().trim();
        if (question.isEmpty()) {
            throw new RuntimeException("Câu hỏi không được để trống");
        }

        User user = userRepo.findById(auth.getName()).orElseThrow();

        ChatMessage userMsg = ChatMessage.builder()
                .groupId(groupId)
                .senderId(auth.getName())
                .senderName(user.getFullName())
                .senderAvatar(user.getAvatar())
                .content("@AI " + question)
                .type(ChatMessage.Type.USER)
                .build();

        chatRepo.save(userMsg);
        messaging.convertAndSend("/topic/group." + groupId, userMsg);

        String aiAnswer;
        try {
            var res = webClientBuilder.build()
                    .post()
                    .uri(mlUrl + "/chat")
                    .bodyValue(Map.of("question", question, "groupId", groupId))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            aiAnswer = res != null
                    ? String.valueOf(res.get("answer"))
                    : "Tính năng AI đang được hoàn thiện, bạn hãy dùng chat nhóm cơ bản trước nhé.";
        } catch (Exception e) {
            aiAnswer = "Tính năng AI đang được hoàn thiện, bạn hãy dùng chat nhóm cơ bản trước nhé.";
        }

        ChatMessage aiMsg = ChatMessage.builder()
                .groupId(groupId)
                .senderId("AI")
                .senderName("StudyMate AI")
                .senderAvatar(null)
                .content(aiAnswer)
                .type(ChatMessage.Type.AI)
                .build();

        chatRepo.save(aiMsg);
        messaging.convertAndSend("/topic/group." + groupId, aiMsg);

        return ResponseEntity.ok(ApiResponse.ok(aiMsg));
    }

    @MessageMapping("/group.{groupId}.sendMessage")
    public void sendMessageWs(
            @DestinationVariable String groupId,
            @Payload Map<String, Object> payload,
            Principal principal
    ) {
        if (principal == null) return;

        String userId = principal.getName();
        String content = payload.get("content") == null ? "" : String.valueOf(payload.get("content"));

        List<ChatMessage.Attachment> attachments = parseAttachments(payload.get("attachments"));
        List<String> mentionUserIds = parseMentionUserIds(payload.get("mentionUserIds"));
        boolean mentionAll = Boolean.parseBoolean(String.valueOf(payload.getOrDefault("mentionAll", false)));
        ChatMessage.ReplyPreview replyTo = parseReply(payload.get("replyTo"));

        ChatMessage msg = buildAndSaveUserMessage(
                groupId,
                userId,
                content,
                attachments,
                mentionUserIds,
                mentionAll,
                replyTo
        );

        documentService.createFromChatAttachments(
                groupId,
                userId,
                msg.getSenderName(),
                msg.getId(),
                msg.getAttachments()
        );

        messaging.convertAndSend("/topic/group." + groupId, msg);
        notifyGroupChat(groupId, userId, msg, mentionUserIds, mentionAll);
    }

    private ChatMessage buildAndSaveUserMessage(
            String groupId,
            String userId,
            String content,
            List<ChatMessage.Attachment> attachments,
            List<String> mentionUserIds,
            boolean mentionAll,
            ChatMessage.ReplyPreview replyTo
    ) {
        Group group = validateMember(groupId, userId);

        String safeContent = content == null ? "" : content.trim();
        List<ChatMessage.Attachment> safeAttachments =
                attachments == null ? new ArrayList<>() : attachments;

        if (safeContent.isEmpty() && safeAttachments.isEmpty()) {
            throw new RuntimeException("Tin nhắn không được để trống");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<String> finalMentionUserIds = mentionUserIds == null ? new ArrayList<>() : new ArrayList<>(mentionUserIds);

        if (mentionAll && group.getMembers() != null) {
            finalMentionUserIds = group.getMembers().stream()
                    .map(Group.GroupMember::getUserId)
                    .filter(id -> !userId.equals(id))
                    .distinct()
                    .collect(Collectors.toList());
        }

        ChatMessage msg = ChatMessage.builder()
                .groupId(groupId)
                .senderId(userId)
                .senderName(user.getFullName())
                .senderAvatar(user.getAvatar())
                .content(safeContent)
                .type(ChatMessage.Type.USER)
                .attachments(safeAttachments)
                .mentionUserIds(finalMentionUserIds)
                .replyTo(replyTo)
                .recalled(false)
                .build();

        return chatRepo.save(msg);
    }

    private void notifyGroupChat(
            String groupId,
            String senderId,
            ChatMessage msg,
            List<String> mentionUserIds,
            boolean mentionAll
    ) {
        Group group = validateMember(groupId, senderId);
        String link = "/groups/" + groupId + "/chat?messageId=" + msg.getId();

        Set<String> mentionSet = new HashSet<>();
        if (mentionAll && group.getMembers() != null) {
            group.getMembers().stream()
                    .map(Group.GroupMember::getUserId)
                    .filter(id -> !senderId.equals(id))
                    .forEach(mentionSet::add);
        }
        if (mentionUserIds != null) {
            mentionUserIds.stream()
                    .filter(id -> !senderId.equals(id))
                    .forEach(mentionSet::add);
        }

        String preview = buildPreview(msg);

        if (group.getMembers() == null) return;

        for (Group.GroupMember member : group.getMembers()) {
            String targetUserId = member.getUserId();
            if (senderId.equals(targetUserId)) continue;

            boolean mentioned = mentionSet.contains(targetUserId);

            notifService.send(
                    targetUserId,
                    "Bạn có tin nhắn mới ở nhóm " + group.getName(),
                    mentioned
                            ? msg.getSenderName() + " đã nhắc bạn: " + preview
                            : msg.getSenderName() + ": " + preview,
                    mentioned ? "CHAT_MESSAGE" : "GROUP_CHAT",
                    link,
                    msg.getSenderId(),
                    msg.getSenderName(),
                    msg.getSenderAvatar(),
                    groupId,
                    msg.getId(),
                    "GROUP_CHAT"
            );
        }
    }

    private String buildPreview(ChatMessage msg) {
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

    private List<ChatMessage.Attachment> parseAttachments(Object rawAttachments) {
        List<ChatMessage.Attachment> attachments = new ArrayList<>();

        if (!(rawAttachments instanceof List<?> list)) {
            return attachments;
        }

        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) continue;

            String name = map.get("name") == null ? "" : String.valueOf(map.get("name"));
            String url = map.get("url") == null ? "" : String.valueOf(map.get("url"));
            String type = map.get("type") == null ? "OTHER" : String.valueOf(map.get("type"));
            long sizeKb = parseLongSafe(map.get("sizeKb"));

            attachments.add(ChatMessage.Attachment.builder()
                    .name(name)
                    .url(url)
                    .type(type)
                    .sizeKb(sizeKb)
                    .build());
        }

        return attachments;
    }

    private List<String> parseMentionUserIds(Object rawMentionIds) {
        if (!(rawMentionIds instanceof List<?> list)) {
            return new ArrayList<>();
        }
        return list.stream().map(String::valueOf).collect(Collectors.toList());
    }

    private ChatMessage.ReplyPreview parseReply(Object rawReply) {
        if (!(rawReply instanceof Map<?, ?> map)) {
            return null;
        }

        String messageId = map.get("messageId") == null ? "" : String.valueOf(map.get("messageId")).trim();
        if (messageId.isBlank()) {
            return null;
        }

        String senderId = map.get("senderId") == null ? "" : String.valueOf(map.get("senderId"));
        String senderName = map.get("senderName") == null ? "" : String.valueOf(map.get("senderName"));
        String content = map.get("content") == null ? "" : String.valueOf(map.get("content"));
        String type = map.get("type") == null ? "USER" : String.valueOf(map.get("type"));

        List<ChatMessage.Attachment> attachments = parseAttachments(map.get("attachments"));

        return ChatMessage.ReplyPreview.builder()
                .messageId(messageId)
                .senderId(senderId)
                .senderName(senderName)
                .content(content)
                .type(type)
                .attachments(attachments)
                .build();
    }

    private long parseLongSafe(Object value) {
        if (value == null) return 0L;
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception e) {
            return 0L;
        }
    }

    private Group validateMember(String groupId, String userId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        boolean isMember = group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m -> userId.equals(m.getUserId()));

        if (!isMember) {
            throw new RuntimeException("Bạn không phải thành viên nhóm này");
        }

        return group;
    }

    private Group validateCanManagePins(String groupId, String userId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Nhóm không tồn tại"));

        boolean canManage = group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m ->
                        userId.equals(m.getUserId()) &&
                                (m.getRole() == Group.Role.LEADER || "DEPUTY".equalsIgnoreCase(String.valueOf(m.getRole())))
                );

        if (!canManage) {
            throw new RuntimeException("Chỉ trưởng nhóm hoặc nhóm phó mới được ghim tin nhắn");
        }

        return group;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendMessageRequest {
        private String content;
        private List<ChatMessage.Attachment> attachments;
        private List<String> mentionUserIds;
        private boolean mentionAll;
        private ChatMessage.ReplyPreview replyTo;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AskAIRequest {
        private String question;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReactRequest {
        private String emoji;
    }
}