package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.MembershipPayment;
import com.studymate.model.MembershipPayment.PaymentStatus;
import com.studymate.repository.MembershipPaymentRepository;
import com.studymate.service.MembershipPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/membership")
@RequiredArgsConstructor
public class AdminMembershipController {

    private final MembershipPaymentService paymentService;
    private final MembershipPaymentRepository paymentRepo;

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.adminStats()));
    }

    @GetMapping("/orders")
    public ResponseEntity<?> orders(@RequestParam(required = false) String status) {
        List<MembershipPayment> list;
        if (status != null && !status.isBlank()) {
            list = paymentRepo.findByStatusOrderByCreatedAtDesc(PaymentStatus.valueOf(status.toUpperCase()));
        } else {
            list = paymentRepo.findAll().stream()
                    .sorted((a, b) -> {
                        if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                        return b.getCreatedAt().compareTo(a.getCreatedAt());
                    })
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PostMapping("/orders/{id}/approve")
    public ResponseEntity<?> approve(
            @PathVariable String id,
            Authentication auth,
            @RequestBody(required = false) Map<String, String> body) {

        String note = body != null ? body.get("adminNote") : null;
        MembershipPayment payment = paymentService.approve(id, auth.getName(), note);
        return ResponseEntity.ok(ApiResponse.ok(payment, "Đã duyệt thanh toán và kích hoạt gói"));
    }

    @PostMapping("/orders/{id}/reject")
    public ResponseEntity<?> reject(
            @PathVariable String id,
            Authentication auth,
            @RequestBody(required = false) Map<String, String> body) {

        String note = body != null ? body.get("adminNote") : null;
        MembershipPayment payment = paymentService.reject(id, auth.getName(), note);
        return ResponseEntity.ok(ApiResponse.ok(payment, "Đã từ chối giao dịch"));
    }
}
