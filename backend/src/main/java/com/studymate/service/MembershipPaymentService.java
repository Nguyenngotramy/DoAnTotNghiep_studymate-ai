package com.studymate.service;

import com.studymate.model.*;
import com.studymate.model.MembershipPayment.PaymentStatus;
import com.studymate.repository.AdminSettingRepository;
import com.studymate.repository.MembershipPaymentRepository;
import com.studymate.repository.RevenueTransactionRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MembershipPaymentService {

    private static final String SETTINGS_ID = "default";

    private final MembershipPaymentRepository paymentRepo;
    private final UserRepository userRepo;
    private final AdminSettingRepository adminSettingRepo;
    private final NotificationService notificationService;
    private final RevenueTransactionRepository revenueTransactionRepo;

    @SuppressWarnings("unchecked")
    public Map<String, Object> getPublicPlansConfig() {
        Map<String, Object> values = adminSettingRepo.findById(SETTINGS_ID)
                .map(s -> s.getValues() != null ? s.getValues() : Map.<String, Object>of())
                .orElse(Map.of());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("bank", values.getOrDefault("membershipBank", defaultBank()));
        out.put("pricing", values.getOrDefault("membershipPricing", defaultPricing()));
        out.put("limits", values.getOrDefault("membershipLimits", defaultLimits()));
        out.put("tierLabels", Map.of(
                "MEMBER", "Thành viên",
                "SILVER", "Bạc",
                "GOLD", "Vàng"
        ));
        out.put("periodLabels", Map.of(
                "WEEK", "Tuần",
                "MONTH", "Tháng",
                "YEAR", "Năm"
        ));
        return out;
    }

    public long resolvePrice(MembershipTier tier, MembershipPeriod period) {
        if (tier == MembershipTier.MEMBER) {
            throw new RuntimeException("Gói Thành viên miễn phí, không cần thanh toán");
        }
        Map<String, Object> values = adminSettingRepo.findById(SETTINGS_ID)
                .map(s -> s.getValues())
                .orElse(null);
        Object pricing = values != null ? values.get("membershipPricing") : null;
        if (pricing instanceof Map<?, ?> pricingMap) {
            Object tierRaw = pricingMap.get(tier.name());
            if (tierRaw instanceof Map<?, ?> periodMap) {
                Object price = periodMap.get(period.name());
                if (price instanceof Number n) return n.longValue();
            }
        }
        Map<String, Object> defaults = defaultPricing();
        Object tierRaw = defaults.get(tier.name());
        if (tierRaw instanceof Map<?, ?> periodMap) {
            Object price = periodMap.get(period.name());
            if (price instanceof Number n) return n.longValue();
        }
        throw new RuntimeException("Chưa cấu hình giá cho gói " + tier.name() + " / " + period.name());
    }

    public MembershipPayment createOrder(String userId, MembershipTier tier, MembershipPeriod period, String userNote) {
        if (tier == MembershipTier.MEMBER) {
            throw new RuntimeException("Không thể thanh toán gói Thành viên");
        }
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        long amount = resolvePrice(tier, period);

        // Check if user has PENDING order with same tier/period
        Optional<MembershipPayment> existingPending = paymentRepo.findByUserIdAndStatusOrderByCreatedAtDesc(userId, PaymentStatus.PENDING);
        if (existingPending.isPresent()) {
            MembershipPayment pending = existingPending.get();
            // Check if expired
            if (pending.getExpiresAt() != null && pending.getExpiresAt().isBefore(Instant.now())) {
                // Auto-expire
                pending.setStatus(PaymentStatus.EXPIRED);
                paymentRepo.save(pending);
            } else {
                // Return existing pending order
                return pending;
            }
        }

        // Case 4: User đang có gói cao hơn và mua gói thấp hơn
        MembershipTier currentTier = user.getMembershipTier() != null ? user.getMembershipTier() : MembershipTier.MEMBER;
        Instant currentExpires = user.getMembershipExpiresAt();
        boolean hasActiveMembership = currentExpires != null && currentExpires.isAfter(Instant.now());

        if (hasActiveMembership && currentTier == MembershipTier.GOLD && tier == MembershipTier.SILVER) {
            throw new RuntimeException("Bạn đang sử dụng gói Gold. Không thể mua gói thấp hơn khi gói hiện tại chưa hết hạn.");
        }

        MembershipPayment payment = MembershipPayment.builder()
                .userId(userId)
                .userEmail(user.getEmail())
                .userFullName(user.getFullName())
                .tier(tier)
                .period(period)
                .amountVnd(amount)
                .userNote(userNote != null ? userNote.trim() : null)
                .status(PaymentStatus.PENDING)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(30, java.time.temporal.ChronoUnit.MINUTES))
                .build();

        payment = paymentRepo.save(payment);
        payment.setTransferCode("SM-" + payment.getId().substring(0, Math.min(8, payment.getId().length())).toUpperCase());
        return paymentRepo.save(payment);
    }

    public MembershipPayment approve(String paymentId, String adminId, String adminNote) {
        MembershipPayment payment = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giao dịch"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Giao dịch đã được xử lý");
        }

        // Check if expired
        if (payment.getExpiresAt() != null && payment.getExpiresAt().isBefore(Instant.now())) {
            throw new RuntimeException("Giao dịch đã hết hạn");
        }

        User user = userRepo.findById(payment.getUserId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        MembershipTier newTier = payment.getTier();
        MembershipTier currentTier = user.getMembershipTier() != null ? user.getMembershipTier() : MembershipTier.MEMBER;
        Instant currentExpires = user.getMembershipExpiresAt();
        boolean hasActiveMembership = currentExpires != null && currentExpires.isAfter(Instant.now());

        Instant newExpires;
        String note;

        // Case 2: User đang có cùng gói active - cộng dồn thời gian
        if (hasActiveMembership && currentTier == newTier) {
            newExpires = currentExpires.plus(periodDays(payment.getPeriod()), ChronoUnit.DAYS);
            note = "Gia hạn gói hiện tại";
        }
        // Case 3: User đang có gói thấp hơn và mua gói cao hơn - nâng cấp
        else if (hasActiveMembership && isUpgrade(currentTier, newTier)) {
            newExpires = Instant.now().plus(periodDays(payment.getPeriod()), ChronoUnit.DAYS);
            note = "Nâng cấp gói";
        }
        // Case 1: User chưa có gói active hoặc gói đã hết hạn
        else {
            newExpires = Instant.now().plus(periodDays(payment.getPeriod()), ChronoUnit.DAYS);
            note = "Kích hoạt gói mới";
        }

        user.setMembershipTier(newTier);
        user.setMembershipExpiresAt(newExpires);
        userRepo.save(user);

        System.out.println("=== APPROVED PAYMENT ===");
        System.out.println("User ID: " + user.getId());
        System.out.println("New Tier: " + newTier);
        System.out.println("New Expires: " + newExpires);
        System.out.println("User after save: " + userRepo.findById(user.getId()).get().getMembershipTier());

        payment.setStatus(PaymentStatus.APPROVED);
        payment.setReviewedAt(Instant.now());
        payment.setApprovedAt(Instant.now());
        payment.setApprovedByAdminId(adminId);
        payment.setAdminNote(adminNote);
        payment.setGrantedExpiresAt(newExpires);
        paymentRepo.save(payment);

        // Create revenue transaction
        RevenueTransaction transaction = RevenueTransaction.builder()
                .paymentRequestId(payment.getId())
                .userId(user.getId())
                .userEmail(user.getEmail())
                .userFullName(user.getFullName())
                .source(RevenueTransaction.RevenueSource.MEMBERSHIP)
                .tier(payment.getTier())
                .period(payment.getPeriod())
                .amountVnd(payment.getAmountVnd())
                .taxRate(10.0) // Default 10% tax rate
                .taxAmount((long) (payment.getAmountVnd() * 0.10))
                .netRevenue((long) (payment.getAmountVnd() * 0.90))
                .createdAt(Instant.now())
                .build();
        revenueTransactionRepo.save(transaction);

        notificationService.send(
                user.getId(),
                "Thanh toán đã được duyệt",
                "Gói " + MembershipQuotaService.tierLabel(payment.getTier()) + " đã được kích hoạt đến "
                        + newExpires,
                "MEMBERSHIP",
                "/membership",
                adminId
        );

        return payment;
    }

    private boolean isUpgrade(MembershipTier current, MembershipTier requested) {
        if (current == MembershipTier.MEMBER) return true;
        if (current == MembershipTier.SILVER && requested == MembershipTier.GOLD) return true;
        return false;
    }

    public MembershipPayment reject(String paymentId, String adminId, String adminNote) {
        MembershipPayment payment = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giao dịch"));
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Giao dịch đã được xử lý");
        }
        payment.setStatus(PaymentStatus.REJECTED);
        payment.setReviewedAt(Instant.now());
        payment.setRejectedAt(Instant.now());
        payment.setRejectedByAdminId(adminId);
        payment.setRejectReason(adminNote);
        payment.setAdminNote(adminNote);
        paymentRepo.save(payment);

        notificationService.send(
                payment.getUserId(),
                "Thanh toán bị từ chối",
                adminNote != null && !adminNote.isBlank()
                        ? "Yêu cầu thanh toán " + payment.getTransferCode() + " bị từ chối: " + adminNote
                        : "Admin chưa xác nhận được khoản chuyển. Vui lòng kiểm tra lại.",
                "MEMBERSHIP",
                "/membership",
                adminId
        );
        return payment;
    }

    public Map<String, Object> adminStats() {
        List<MembershipPayment> all = paymentRepo.findAll();
        long pending = all.stream().filter(p -> p.getStatus() == PaymentStatus.PENDING).count();
        long approved = all.stream().filter(p -> p.getStatus() == PaymentStatus.APPROVED).count();
        long rejected = all.stream().filter(p -> p.getStatus() == PaymentStatus.REJECTED).count();
        long revenue = all.stream()
                .filter(p -> p.getStatus() == PaymentStatus.APPROVED)
                .mapToLong(MembershipPayment::getAmountVnd)
                .sum();

        Map<String, Long> revenueByTier = new LinkedHashMap<>();
        for (MembershipTier t : MembershipTier.values()) {
            if (t == MembershipTier.MEMBER) continue;
            long sum = all.stream()
                    .filter(p -> p.getStatus() == PaymentStatus.APPROVED && p.getTier() == t)
                    .mapToLong(MembershipPayment::getAmountVnd)
                    .sum();
            revenueByTier.put(t.name(), sum);
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalOrders", all.size());
        stats.put("pending", pending);
        stats.put("approved", approved);
        stats.put("rejected", rejected);
        stats.put("totalRevenueVnd", revenue);
        stats.put("revenueByTier", revenueByTier);
        stats.put("recent", all.stream()
                .sorted(Comparator.comparing(MembershipPayment::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .toList());
        return stats;
    }

    private long periodDays(MembershipPeriod period) {
        return switch (period) {
            case WEEK -> 7;
            case YEAR -> 365;
            default -> 30;
        };
    }

    public static Map<String, Object> defaultBank() {
        Map<String, Object> bank = new LinkedHashMap<>();
        bank.put("bankName", "Vietcombank");
        bank.put("accountNumber", "0123456789");
        bank.put("accountName", "STUDYMATE AI");
        bank.put("qrImageUrl", "");
        bank.put("transferPrefix", "SM");
        bank.put("note", "Nội dung CK: mã đơn hàng (SM-...) + email đăng ký");
        return bank;
    }

    public static Map<String, Object> defaultPricing() {
        Map<String, Object> pricing = new LinkedHashMap<>();
        pricing.put("SILVER", Map.of("WEEK", 50000, "MONTH", 200000, "YEAR", 2000000));
        pricing.put("GOLD", Map.of("WEEK", 100000, "MONTH", 400000, "YEAR", 4000000));
        return pricing;
    }

    public static Map<String, Object> defaultLimits() {
        Map<String, Object> limits = new LinkedHashMap<>();
        limits.put("MEMBER", Map.of("maxGroups", 5, "studyDriveMb", 500, "aiTrendPerMonth", 3));
        limits.put("SILVER", Map.of("maxGroups", 20, "studyDriveMb", 2048, "aiTrendPerMonth", 30));
        limits.put("GOLD", Map.of("maxGroups", -1, "studyDriveMb", 10240, "aiTrendPerMonth", -1));
        return limits;
    }
}
