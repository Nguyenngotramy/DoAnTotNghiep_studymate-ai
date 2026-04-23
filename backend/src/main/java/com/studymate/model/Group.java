package com.studymate.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.*;

@Document(collection = "groups")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Group {

    @Id
    private String id;

    private String name;
    private String description;
    private String subject;
    private String coverColor;

    /**
     * true  = hiện mã nhóm ra ngoài (nhóm công khai)
     * false = ẩn mã nhóm (nhóm riêng tư)
     */
    @Builder.Default
    private boolean publicVisible = true;

    /**
     * true  = nhập mã xong phải chờ trưởng nhóm duyệt
     * false = nhập mã xong vào nhóm luôn
     */
    @Builder.Default
    private boolean requireApproval = false;

    /**
     * true  = bài đăng mới phải chờ trưởng nhóm duyệt
     * false = đăng là hiện luôn
     */
    @Builder.Default
    private boolean requirePostApproval = false;

    @Indexed(unique = true)
    private String inviteCode;

    @Builder.Default
    private List<GroupMember> members = new ArrayList<>();

    @Builder.Default
    private List<JoinRequest> joinRequests = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public int getMemberCount() {
        return members == null ? 0 : members.size();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupMember {
        private String userId;
        private String fullName;
        private Role role;
        private Instant joinedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JoinRequest {
        private String userId;
        private String fullName;
        private Status status;
        private Instant requestedAt;
    }

    public enum Role {
        LEADER, DEPUTY, MEMBER, VIEWER
    }

    public enum Status {
        PENDING, APPROVED, REJECTED
    }
}