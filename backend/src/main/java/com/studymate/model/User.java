package com.studymate.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.*;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    @JsonIgnore
    private String password;

    private String fullName;
    private String studentCode;
    private String avatar;
    private String coverImage;
    private String bio;
    private String location;
    private String school;

    @Builder.Default
    private Role role = Role.USER;

    @Builder.Default
    private boolean locked = false;

    /** Khóa tạm thời — hết hạn thì tự mở (trừ khóa vĩnh viễn). */
    private Instant lockedUntil;

    @Builder.Default
    private boolean permanentlyBanned = false;

    /** Đã từng bị khóa tạm do đủ ngưỡng cảnh cáo mức tương ứng — lần sau → vĩnh viễn. */
    @Builder.Default
    private boolean reminderDisciplineApplied = false;

    @Builder.Default
    private boolean warningDisciplineApplied = false;

    @Builder.Default
    private boolean severeDisciplineApplied = false;

    @Builder.Default
    private int xp = 0;

    @Builder.Default
    private int streak = 0;

    private Instant lastStreakAt;

    private Instant lastLoginRewardAt;

    @Builder.Default
    private List<UserSkill> skills = new ArrayList<>();

    // ── Onboarding ───────────────────────────────────────────────
    @Builder.Default
    private boolean onboardingDone = false;

    private String userType; // STUDENT | HIGHSCHOOL | TEACHER | OTHER
    private String goal;
    private String major;

    @Builder.Default
    private List<String> interestedFields = new ArrayList<>();

    @Builder.Default
    private List<String> strongSubjects = new ArrayList<>();

    @Builder.Default
    private List<String> weakSubjects = new ArrayList<>();

    // ── Lịch rảnh (cho matching) ─────────────────────────────────
    @Builder.Default
    private List<AvailableSlot> availableSchedule = new ArrayList<>();

    // ── Feed personalization ─────────────────────────────────────
    @Builder.Default
    private List<String> interests = new ArrayList<>();

    @Builder.Default
    private Map<String, Integer> tagViewCount = new HashMap<>();

    @Builder.Default
    private List<String> viewedPostIds = new ArrayList<>();

    // Danh sách bài viết user đã ẩn khỏi feed cá nhân
    @Builder.Default
    private List<String> hiddenPostIds = new ArrayList<>();

    // ── Gói thành viên ───────────────────────────────────────────
    @Builder.Default
    private MembershipTier membershipTier = MembershipTier.MEMBER;

    /** Hết hạn gói SILVER/GOLD */
    private Instant membershipExpiresAt;

    // ── Balance (số dư tài khoản) ────────────────────────────────
    @Builder.Default
    private long balance = 0;

    @Transient
    private Integer matchScore;

    @Transient
    @Builder.Default
    private List<String> commonSubjects = new ArrayList<>();

    @Transient
    private String matchReason;

    // ── Settings (notification prefs, theme...) ──────────────────
    private Object settings;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    // ── Enums & nested classes ────────────────────────────────────
    public enum Role {
        USER, ADMIN
    }

    public enum MembershipTier {
        MEMBER, SILVER, GOLD
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSkill {
        private String subject;
        private int level;   // 1=Mới, 2=Khá, 3=Giỏi
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AvailableSlot {
        private String dayOfWeek;  // MON, TUE, WED, THU, FRI, SAT, SUN
        private String startTime;  // "08:00"
        private String endTime;    // "10:00"
    }
}
