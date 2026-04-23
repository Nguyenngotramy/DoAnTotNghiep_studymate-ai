package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    private String id;

    /**
     * người nhận thông báo
     */
    private String userId;

    /**
     * tiêu đề hiển thị
     */
    private String title;

    /**
     * nội dung hiển thị
     */
    private String body;

    /**
     * link điều hướng khi bấm vào thông báo
     * ví dụ:
     * /inbox/123
     * /groups/abc/chat
     */
    private String link;

    /**
     * loại thông báo
     * ví dụ:
     * DM
     * GROUP_CHAT
     * FRIEND_REQUEST
     * GROUP_JOIN_REQUEST
     * GROUP_REQUEST_APPROVED
     * POST_LIKED
     * DOC
     */
    private String type;

    /**
     * người tạo ra sự kiện thông báo
     * ví dụ người gửi tin nhắn
     */
    private String actorId;
    private String actorName;
    private String actorAvatar;

    /**
     * context để frontend xử lý dễ hơn
     */
    private String groupId;
    private String sourceId;
    private String sourceType;

    @Builder.Default
    private boolean read = false;

    @CreatedDate
    private Instant createdAt;
}