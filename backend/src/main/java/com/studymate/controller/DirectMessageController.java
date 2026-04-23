package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.ChatMessage;
import com.studymate.model.DirectMessage;
import com.studymate.model.Group;
import com.studymate.model.User;
import com.studymate.repository.ChatMessageRepository;
import com.studymate.repository.DirectMessageRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.NotificationRepository;
import com.studymate.repository.UserRepository;
import com.studymate.service.DirectMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/dm")
@RequiredArgsConstructor
public class DirectMessageController {

    private static final List<String> GROUP_CHAT_NOTIFICATION_TYPES =
            List.of("GROUP_CHAT", "CHAT_MESSAGE", "CHAT");

    private final DirectMessageService dmService;
    private final DirectMessageRepository dmRepo;
    private final UserRepository userRepo;
    private final GroupRepository groupRepo;
    private final ChatMessageRepository chatMessageRepository;
    private final NotificationRepository notificationRepository;

    @GetMapping("/conversations")
    public ResponseEntity<?> conversations(Authentication auth) {
        String myId = auth.getName();

        List<Map<String, Object>> threads = new ArrayList<>();
        threads.addAll(buildDmThreads(myId));
        threads.addAll(buildGroupThreads(myId));

        threads.sort((a, b) -> {
            Instant ta = parseInstant(a.get("sortTime"));
            Instant tb = parseInstant(b.get("sortTime"));
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return tb.compareTo(ta);
        });

        threads.forEach(t -> t.remove("sortTime"));
        return ResponseEntity.ok(ApiResponse.ok(threads));
    }

    private List<Map<String, Object>> buildDmThreads(String myId) {
        List<DirectMessage> all = dmRepo.findLatestConversations(myId);

        all.sort((a, b) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        Map<String, DirectMessage> latestByPartner = new LinkedHashMap<>();
        for (DirectMessage msg : all) {
            String sid = msg.getSenderId();
            String rid = msg.getReceiverId();
            if ("AI".equalsIgnoreCase(sid)) continue;

            String partnerId = sid.equals(myId) ? rid : sid;
            latestByPartner.putIfAbsent(partnerId, msg);
        }

        List<Map<String, Object>> convs = new ArrayList<>();
        for (Map.Entry<String, DirectMessage> entry : latestByPartner.entrySet()) {
            String partnerId = entry.getKey();
            DirectMessage lastMsg = entry.getValue();

            Optional<User> partnerOpt = userRepo.findById(partnerId);
            long unread = dmRepo.countBySenderIdAndReceiverIdAndReadAtIsNull(partnerId, myId);

            Map<String, Object> lastMsgMap = new LinkedHashMap<>();
            lastMsgMap.put("id", lastMsg.getId());
            lastMsgMap.put("senderId", lastMsg.getSenderId());
            lastMsgMap.put("receiverId", lastMsg.getReceiverId());
            lastMsgMap.put("senderName", lastMsg.getSenderName());
            lastMsgMap.put("senderAvatar", lastMsg.getSenderAvatar());
            lastMsgMap.put("content", lastMsg.getContent());
            lastMsgMap.put("type", lastMsg.getType().name());
            lastMsgMap.put("pinned", lastMsg.isPinned());
            lastMsgMap.put("attachments", lastMsg.getAttachments());
            lastMsgMap.put("reactions", lastMsg.getReactions());
            lastMsgMap.put("replyTo", lastMsg.getReplyTo());
            lastMsgMap.put("recalled", lastMsg.isRecalled());
            lastMsgMap.put("recalledAt", lastMsg.getRecalledAt() != null ? lastMsg.getRecalledAt().toString() : null);
            lastMsgMap.put("recalledBy", lastMsg.getRecalledBy());
            lastMsgMap.put("createdAt", lastMsg.getCreatedAt() != null ? lastMsg.getCreatedAt().toString() : null);

            Instant lastActive = null;

            Map<String, Object> userMap = new LinkedHashMap<>();
            if (partnerOpt.isPresent()) {
                User u = partnerOpt.get();
                userMap.put("id", u.getId());
                userMap.put("fullName", u.getFullName());
                userMap.put("avatar", u.getAvatar());
                userMap.put("bio", u.getBio());
                userMap.put("xp", u.getXp());
                userMap.put("streak", u.getStreak());
                lastActive = u.getUpdatedAt();
                userMap.put("lastActiveAt", lastActive != null ? lastActive.toString() : null);
            } else {
                userMap.put("id", partnerId);
                userMap.put("fullName", "Người dùng");
                userMap.put("avatar", null);
                userMap.put("lastActiveAt", null);
            }

            if (lastMsg.getCreatedAt() != null && (lastActive == null || lastMsg.getCreatedAt().isAfter(lastActive))) {
                lastActive = lastMsg.getCreatedAt();
            }

            Map<String, Object> conv = new LinkedHashMap<>();
            conv.put("threadType", "DM");
            conv.put("routePath", "/inbox/" + partnerId);
            conv.put("title", userMap.get("fullName"));
            conv.put("avatar", userMap.get("avatar"));
            conv.put("userId", partnerId);
            conv.put("user", userMap);
            conv.put("lastMessage", lastMsgMap);
            conv.put("unreadCount", unread);
            conv.put("online", lastActive != null && lastActive.isAfter(Instant.now().minusSeconds(300)));
            conv.put("lastActiveAt", lastActive != null ? lastActive.toString() : null);
            conv.put("sortTime", lastMsg.getCreatedAt() != null ? lastMsg.getCreatedAt().toString() : null);

            convs.add(conv);
        }

        return convs;
    }

    private List<Map<String, Object>> buildGroupThreads(String myId) {
        List<Map<String, Object>> result = new ArrayList<>();

        List<Group> groups = groupRepo.findByMemberId(myId);
        for (Group group : groups) {
            String groupId = group.getId();

            var page = chatMessageRepository.findByGroupIdOrderByCreatedAtDesc(groupId, PageRequest.of(0, 1));
            ChatMessage lastMsg = page.hasContent() ? page.getContent().get(0) : null;

            long unreadGroup = notificationRepository.countByUserIdAndGroupIdAndReadFalseAndTypeIn(
                    myId,
                    groupId,
                    GROUP_CHAT_NOTIFICATION_TYPES
            );

            Map<String, Object> lastMsgMap = new LinkedHashMap<>();
            if (lastMsg != null) {
                lastMsgMap.put("id", lastMsg.getId());
                lastMsgMap.put("senderId", lastMsg.getSenderId());
                lastMsgMap.put("senderName", lastMsg.getSenderName());
                lastMsgMap.put("senderAvatar", lastMsg.getSenderAvatar());
                lastMsgMap.put("content", lastMsg.getContent());
                lastMsgMap.put("type", String.valueOf(lastMsg.getType()));
                lastMsgMap.put("pinned", lastMsg.isPinned());
                lastMsgMap.put("attachments", lastMsg.getAttachments());
                lastMsgMap.put("reactions", lastMsg.getReactions());
                lastMsgMap.put("replyTo", lastMsg.getReplyTo());
                lastMsgMap.put("recalled", lastMsg.isRecalled());
                lastMsgMap.put("recalledAt", lastMsg.getRecalledAt() != null ? lastMsg.getRecalledAt().toString() : null);
                lastMsgMap.put("recalledBy", lastMsg.getRecalledBy());
                lastMsgMap.put("createdAt", lastMsg.getCreatedAt() != null ? lastMsg.getCreatedAt().toString() : null);
            }

            Map<String, Object> thread = new LinkedHashMap<>();
            thread.put("threadType", "GROUP");
            thread.put("routePath", "/groups/" + groupId + "/chat");
            thread.put("groupId", groupId);
            thread.put("groupName", group.getName());
            thread.put("groupColor", group.getCoverColor());
            thread.put("groupDescription", group.getDescription());
            thread.put("title", group.getName());
            thread.put("avatar", null);
            thread.put("lastMessage", lastMsgMap);
            thread.put("unreadCount", unreadGroup);
            thread.put("online", false);
            thread.put(
                    "lastActiveAt",
                    lastMsg != null && lastMsg.getCreatedAt() != null
                            ? lastMsg.getCreatedAt().toString()
                            : null
            );
            thread.put(
                    "sortTime",
                    lastMsg != null && lastMsg.getCreatedAt() != null
                            ? lastMsg.getCreatedAt().toString()
                            : group.getUpdatedAt() != null
                            ? group.getUpdatedAt().toString()
                            : null
            );

            result.add(thread);
        }

        return result;
    }

    private Instant parseInstant(Object value) {
        if (value == null) return null;
        try {
            return Instant.parse(String.valueOf(value));
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> messages(
            @PathVariable String userId,
            Authentication auth,
            @RequestParam(defaultValue = "0") int page
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                dmService.getConversation(auth.getName(), userId, page)
        ));
    }

    @GetMapping("/{userId}/pinned")
    public ResponseEntity<?> pinned(
            @PathVariable String userId,
            Authentication auth
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                dmService.getPinnedConversation(auth.getName(), userId)
        ));
    }

    @PostMapping("/{userId}")
    public ResponseEntity<?> send(
            @PathVariable String userId,
            Authentication auth,
            @RequestBody Map<String, Object> body
    ) {
        String content = body.get("content") == null ? "" : String.valueOf(body.get("content"));
        String type = body.get("type") == null ? "TEXT" : String.valueOf(body.get("type"));

        List<DirectMessage.Attachment> attachments = parseAttachments(body.get("attachments"));
        DirectMessage.ReplyPreview replyTo = parseReply(body.get("replyTo"));

        return ResponseEntity.ok(ApiResponse.ok(
                dmService.send(auth.getName(), userId, content, type, attachments, replyTo)
        ));
    }

    @PostMapping("/{userId}/ai")
    public ResponseEntity<?> askAI(
            @PathVariable String userId,
            Authentication auth,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                dmService.askAI(auth.getName(), userId, body.get("question"))
        ));
    }

    @PostMapping("/{userId}/read")
    public ResponseEntity<?> markRead(@PathVariable String userId, Authentication auth) {
        dmService.markRead(userId, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/messages/{messageId}/pin")
    public ResponseEntity<?> pin(Authentication auth, @PathVariable String messageId) {
        return ResponseEntity.ok(ApiResponse.ok(
                dmService.togglePin(auth.getName(), messageId, true)
        ));
    }

    @PostMapping("/messages/{messageId}/unpin")
    public ResponseEntity<?> unpin(Authentication auth, @PathVariable String messageId) {
        return ResponseEntity.ok(ApiResponse.ok(
                dmService.togglePin(auth.getName(), messageId, false)
        ));
    }

    @PostMapping("/messages/{messageId}/react")
    public ResponseEntity<?> react(
            Authentication auth,
            @PathVariable String messageId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                dmService.react(auth.getName(), messageId, body.get("emoji"))
        ));
    }

    @PostMapping("/messages/{messageId}/recall")
    public ResponseEntity<?> recall(
            Authentication auth,
            @PathVariable String messageId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                dmService.recall(auth.getName(), messageId),
                "Đã thu hồi tin nhắn"
        ));
    }

    private List<DirectMessage.Attachment> parseAttachments(Object rawAttachments) {
        List<DirectMessage.Attachment> attachments = new ArrayList<>();

        if (!(rawAttachments instanceof List<?> list)) {
            return attachments;
        }

        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) continue;

            String name = map.get("name") == null ? "" : String.valueOf(map.get("name"));
            String url = map.get("url") == null ? "" : String.valueOf(map.get("url"));
            String type = map.get("type") == null ? "FILE" : String.valueOf(map.get("type"));
            long sizeKb = parseLongSafe(map.get("sizeKb"));

            attachments.add(
                    DirectMessage.Attachment.builder()
                            .name(name)
                            .url(url)
                            .type(type)
                            .sizeKb(sizeKb)
                            .build()
            );
        }

        return attachments;
    }

    private DirectMessage.ReplyPreview parseReply(Object rawReply) {
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
        String type = map.get("type") == null ? "TEXT" : String.valueOf(map.get("type"));

        List<DirectMessage.Attachment> replyAttachments = parseAttachments(map.get("attachments"));

        return DirectMessage.ReplyPreview.builder()
                .messageId(messageId)
                .senderId(senderId)
                .senderName(senderName)
                .content(content)
                .type(type)
                .attachments(replyAttachments)
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
}