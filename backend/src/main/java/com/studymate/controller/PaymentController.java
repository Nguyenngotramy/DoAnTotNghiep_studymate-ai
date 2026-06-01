package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.dto.request.PaymentCreateRequest;
import com.studymate.model.Payment;
import com.studymate.repository.PaymentRepository;
import com.studymate.service.MoMoPaymentService;
import com.studymate.service.VNPayPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final MoMoPaymentService moMoPaymentService;
    private final VNPayPaymentService vnPayPaymentService;
    private final PaymentRepository paymentRepository;

    @PostMapping("/create")
    public ResponseEntity<?> createPayment(
            Authentication auth,
            @RequestBody PaymentCreateRequest request) {

        try {
            Payment payment;
            if ("MOMO".equalsIgnoreCase(request.getProvider())) {
                payment = moMoPaymentService.createPayment(auth.getName(), request.getAmountVnd());
            } else if ("VNPAY".equalsIgnoreCase(request.getProvider())) {
                payment = vnPayPaymentService.createPayment(auth.getName(), request.getAmountVnd());
            } else {
                return ResponseEntity.badRequest().body(
                        ApiResponse.error("Invalid payment provider. Use MOMO or VNPAY"));
            }

            return ResponseEntity.ok(ApiResponse.ok(
                    Map.of(
                            "paymentId", payment.getId(),
                            "payUrl", payment.getPayUrl(),
                            "orderId", payment.getOrderId(),
                            "amountVnd", payment.getAmountVnd(),
                            "provider", payment.getProvider()
                    ),
                    "Đã tạo yêu cầu thanh toán thành công"
            ));
        } catch (Exception e) {
            log.error("Error creating payment", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("Không thể tạo yêu cầu thanh toán"));
        }
    }

    @PostMapping("/momo/callback")
    public ResponseEntity<?> moMoCallback(@RequestBody Map<String, String> callbackData) {
        log.info("Received MoMo callback: {}", callbackData);
        
        boolean success = moMoPaymentService.processCallback(callbackData);
        
        if (success) {
            return ResponseEntity.ok(ApiResponse.ok("Callback processed successfully"));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Callback processing failed"));
        }
    }

    @PostMapping("/vnpay/callback")
    public ResponseEntity<?> vnPayCallback(@RequestParam Map<String, String> callbackData) {
        log.info("Received VNPay callback: {}", callbackData);
        
        boolean success = vnPayPaymentService.processCallback(callbackData);
        
        if (success) {
            return ResponseEntity.ok(ApiResponse.ok("Callback processed successfully"));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Callback processing failed"));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getPaymentHistory(Authentication auth) {
        List<Payment> payments = paymentRepository.findByUserIdOrderByCreatedAtDesc(auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<?> getPayment(Authentication auth, @PathVariable String paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElse(null);
        
        if (payment == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Only allow user to see their own payments
        if (!payment.getUserId().equals(auth.getName())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        }
        
        return ResponseEntity.ok(ApiResponse.ok(payment));
    }
}
