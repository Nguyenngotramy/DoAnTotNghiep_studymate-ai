package com.studymate.service;

import com.studymate.model.User.MembershipTier;
import com.studymate.model.MembershipUsage;
import com.studymate.model.SavedStudyItem;
import com.studymate.model.User;
import com.studymate.repository.AdminSettingRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.MembershipUsageRepository;
import com.studymate.repository.SavedStudyItemRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MembershipQuotaService {

    private static final String SETTINGS_ID = "default";
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AdminSettingRepository adminSettingRepo;
    private final UserRepository userRepo;
    private final GroupRepository groupRepo;
    private final SavedStudyItemRepository studyItemRepo;
    private final MembershipUsageRepository usageRepo;

    public record TierLimits(int maxGroups, long studyDriveMb, int aiTrendPerMonth) {
        boolean unlimitedGroups() {
            return maxGroups < 0;
        }

        boolean unlimitedAiTrend() {
            return aiTrendPerMonth < 0;
        }

        boolean unlimitedStorage() {
            return studyDriveMb < 0;
        }
    }

    public MembershipTier effectiveTier(User user) {
        if (user == null) return MembershipTier.MEMBER;
        MembershipTier tier = user.getMembershipTier() != null ? user.getMembershipTier() : MembershipTier.MEMBER;
        if (tier == MembershipTier.MEMBER) return MembershipTier.MEMBER;
        Instant exp = user.getMembershipExpiresAt();
        if (exp != null && exp.isBefore(Instant.now())) {
            return MembershipTier.MEMBER;
        }
        return tier;
    }

    public User requireUser(String userId) {
        return userRepo.findById(userId).orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> settingsValues() {
        return adminSettingRepo.findById(SETTINGS_ID)
                .map(s -> s.getValues() != null ? s.getValues() : Map.<String, Object>of())
                .orElse(Map.of());
    }

    public TierLimits limitsFor(MembershipTier tier) {
        Map<String, Object> values = settingsValues();
        Object raw = values.get("membershipLimits");
        if (!(raw instanceof Map<?, ?> limitsMap)) {
            return defaultLimits(tier);
        }
        Object tierRaw = limitsMap.get(tier.name());
        if (!(tierRaw instanceof Map<?, ?> tierMap)) {
            return defaultLimits(tier);
        }
        return new TierLimits(
                intVal(tierMap.get("maxGroups"), defaultLimits(tier).maxGroups()),
                longVal(tierMap.get("studyDriveMb"), defaultLimits(tier).studyDriveMb()),
                intVal(tierMap.get("aiTrendPerMonth"), defaultLimits(tier).aiTrendPerMonth())
        );
    }

    private TierLimits defaultLimits(MembershipTier tier) {
        return switch (tier) {
            case SILVER -> new TierLimits(20, 2048, 30);
            case GOLD -> new TierLimits(-1, 10240, -1);
            default -> new TierLimits(5, 500, 3);
        };
    }

    public void assertCanCreateGroup(String userId) {
        User user = requireUser(userId);
        MembershipTier tier = effectiveTier(user);
        TierLimits limits = limitsFor(tier);
        if (limits.unlimitedGroups()) return;

        long led = groupRepo.countGroupsLedByUserId(userId);
        if (led >= limits.maxGroups()) {
            throw new RuntimeException(
                    "Bạn đã tạo tối đa " + limits.maxGroups() + " nhóm ở hạng "
                            + tierLabel(tier) + ". Nâng cấp Bạc/Vàng để tạo thêm nhóm.");
        }
    }

    public void assertCanUseAiTrend(String userId) {
        User user = requireUser(userId);
        MembershipTier tier = effectiveTier(user);
        TierLimits limits = limitsFor(tier);
        if (limits.unlimitedAiTrend()) return;

        int used = currentAiTrendCount(userId);
        if (used >= limits.aiTrendPerMonth()) {
            throw new RuntimeException(
                    "Đã dùng hết " + limits.aiTrendPerMonth() + " lượt AI (quiz/flashcard/tóm tắt) tháng này ở hạng "
                            + tierLabel(tier) + ". Nâng cấp gói để tiếp tục.");
        }
    }

    public void recordAiTrendUse(String userId) {
        String monthKey = YearMonth.now(ZONE).toString();
        MembershipUsage usage = usageRepo.findByUserIdAndMonthKey(userId, monthKey)
                .orElseGet(() -> MembershipUsage.builder()
                        .userId(userId)
                        .monthKey(monthKey)
                        .aiTrendCount(0)
                        .build());
        usage.setAiTrendCount(usage.getAiTrendCount() + 1);
        usageRepo.save(usage);
    }

    public int currentAiTrendCount(String userId) {
        String monthKey = YearMonth.now(ZONE).toString();
        return usageRepo.findByUserIdAndMonthKey(userId, monthKey)
                .map(MembershipUsage::getAiTrendCount)
                .orElse(0);
    }

    public long currentStudyDriveMb(String userId) {
        List<SavedStudyItem> items = studyItemRepo.findByUserIdOrderByCreatedAtDesc(userId);
        long totalKb = 0;
        for (SavedStudyItem item : items) {
            if (item.getAttachments() == null) continue;
            for (SavedStudyItem.Attachment att : item.getAttachments()) {
                totalKb += Math.max(0, att.getSizeKb());
            }
        }
        return totalKb / 1024;
    }

    public void assertCanUploadStudyDrive(String userId, long additionalKb) {
        User user = requireUser(userId);
        MembershipTier tier = effectiveTier(user);
        TierLimits limits = limitsFor(tier);
        if (limits.unlimitedStorage()) return;

        long usedMb = currentStudyDriveMb(userId);
        long addMb = Math.max(1, additionalKb / 1024);
        if (usedMb + addMb > limits.studyDriveMb()) {
            throw new RuntimeException(
                    "Học tập cá nhân đã dùng ~" + usedMb + "MB / " + limits.studyDriveMb()
                            + "MB (hạng " + tierLabel(tier) + "). Nạp tiền nâng cấp để mở thêm dung lượng.");
        }
    }

    public Map<String, Object> buildSummary(String userId) {
        User user = requireUser(userId);
        MembershipTier tier = effectiveTier(user);
        TierLimits limits = limitsFor(tier);

        long groupsLed = groupRepo.countGroupsLedByUserId(userId);
        long storageMb = currentStudyDriveMb(userId);
        int aiUsed = currentAiTrendCount(userId);

        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("groupsLed", groupsLed);
        usage.put("maxGroups", limits.maxGroups());
        usage.put("studyDriveMbUsed", storageMb);
        usage.put("studyDriveMbLimit", limits.studyDriveMb());
        usage.put("aiTrendUsed", aiUsed);
        usage.put("aiTrendLimit", limits.aiTrendPerMonth());

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("tier", tier.name());
        summary.put("tierLabel", tierLabel(tier));
        summary.put("membershipExpiresAt", user.getMembershipExpiresAt());
        summary.put("storedTier", user.getMembershipTier() != null ? user.getMembershipTier().name() : MembershipTier.MEMBER.name());
        summary.put("limits", Map.of(
                "maxGroups", limits.maxGroups(),
                "studyDriveMb", limits.studyDriveMb(),
                "aiTrendPerMonth", limits.aiTrendPerMonth()
        ));
        summary.put("usage", usage);
        return summary;
    }

    public static String tierLabel(MembershipTier tier) {
        return switch (tier) {
            case SILVER -> "Bạc";
            case GOLD -> "Vàng";
            default -> "Thành viên";
        };
    }

    private static int intVal(Object v, int fallback) {
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception e) {
            return fallback;
        }
    }

    private static long longVal(Object v, long fallback) {
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (Exception e) {
            return fallback;
        }
    }
}
