package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.MembershipPayment;
import com.studymate.model.MembershipPeriod;
import com.studymate.model.MembershipTier;
import com.studymate.repository.MembershipPaymentRepository;
import com.studymate.service.MembershipPaymentService;
import com.studymate.service.MembershipQuotaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/membership")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipQuotaService quotaService;
    private final MembershipPaymentService paymentService;
    private final MembershipPaymentRepository paymentRepo;

    @GetMapping("/me")
    public ResponseEntity<?> myMembership(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(quotaService.buildSummary(auth.getName())));
    }

    @GetMapping("/plans")
    public ResponseEntity<?> plans() {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getPublicPlansConfig()));
    }

    @GetMapping("/orders")
    public ResponseEntity<?> myOrders(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(paymentRepo.findByUserIdOrderByCreatedAtDesc(auth.getName())));
    }

    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(
            Authentication auth,
            @RequestBody Map<String, String> body) {

        String tierStr = body.getOrDefault("tier", "SILVER").toUpperCase();
        String periodStr = body.getOrDefault("period", "MONTH").toUpperCase();
        MembershipTier tier = MembershipTier.valueOf(tierStr);
        MembershipPeriod period = MembershipPeriod.valueOf(periodStr);

        MembershipPayment order = paymentService.createOrder(
                auth.getName(),
                tier,
                period,
                body.get("note")
        );
        return ResponseEntity.ok(ApiResponse.ok(order, "Đã tạo yêu cầu thanh toán. Vui lòng chuyển khoản theo hướng dẫn."));
    }
}
