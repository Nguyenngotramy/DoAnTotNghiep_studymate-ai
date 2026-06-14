package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    private String id;

    private String groupId;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String content;

    @Builder.Default
    private Type type = Type.USER;

    @Builder.Default
    private boolean pinned = false;

    @Builder.Default
    private List<String> mentionUserIds = new ArrayList<>();

    @Builder.Default
    private List<Attachment> attachments = new ArrayList<>();

    @Builder.Default
    private List<Reaction> reactions = new ArrayList<>();

    /**
     * Tin nhắn đang reply tới
     */
    private ReplyPreview replyTo;

    /**
     * true = tin nhắn đã bị thu hồi
     */
    @Builder.Default
    private boolean recalled = false;

    private Instant recalledAt;
    private String recalledBy;

    private TaskProposal taskProposal;

    @CreatedDate
    private Instant createdAt;

    public enum Type {
        USER, AI, SYSTEM
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Attachment {
        private String name;
        private String url;
        private String type;
        private long sizeKb;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Reaction {
        private String emoji;

        @Builder.Default
        private List<String> userIds = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReplyPreview {
        private String messageId;
        private String senderId;
        private String senderName;
        private String content;
        private String type;

        @Builder.Default
        private List<Attachment> attachments = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskProposal {
        private String summary;

        @Builder.Default
        private ProposalStatus status = ProposalStatus.PENDING;

        @Builder.Default
        private List<ProposedTask> tasks = new ArrayList<>();

        @Builder.Default
        private List<String> createdTaskIds = new ArrayList<>();

        private String approvedBy;
        private Instant approvedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProposedTask {
        private String title;
        private String description;
        private String priority;
        private String assigneeId;
        private String assigneeName;
        private Instant deadline;
    }

    public enum ProposalStatus {
        PENDING, APPROVED
    }
}
