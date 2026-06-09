package com.studymate.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studymate.model.Payment;
import com.studymate.model.User;
import com.studymate.repository.PaymentRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VNPayPaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${payment.vnpay.tmn-code}")
    private String tmnCode;

    @Value("${payment.vnpay.hash-secret}")
    private String hashSecret;

    @Value("${payment.vnpay.api-url}")
    private String apiUrl;

    @Value("${payment.vnpay.return-url}")
    private String returnUrl;

    public Payment createPayment(String userId, long amountVnd) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String orderId = "SM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String transactionRef = UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        // Build VNPay request parameters
        Map<String, String> vnpParams = new LinkedHashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", tmnCode);
        vnpParams.put("vnp_Amount", String.valueOf(amountVnd * 100)); // VNPay requires amount in cents
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", transactionRef);
        vnpParams.put("vnp_OrderInfo", "Nạp tiền vào tài khoản StudyMate");
        vnpParams.put("vnp_OrderType", "topup");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", returnUrl);
        vnpParams.put("vnp_IpAddr", "127.0.0.1"); // Should be client IP in production

        // Create payment URL
        Instant now = Instant.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
        
        vnpParams.put("vnp_CreateDate", formatter.format(now));
        vnpParams.put("vnp_ExpireDate", formatter.format(now.plusSeconds(900))); // 15 minutes

        String signature = generateVNPaySignature(vnpParams);
        vnpParams.put("vnp_SecureHash", signature);

        String payUrl = buildPaymentUrl(vnpParams);

        // Save payment record
        Payment payment = Payment.builder()
                .userId(userId)
                .userEmail(user.getEmail())
                .userFullName(user.getFullName())
                .provider(Payment.PaymentProvider.VNPAY)
                .status(Payment.PaymentStatus.PENDING)
                .amountVnd(amountVnd)
                .orderId(orderId)
                .transactionId(transactionRef)
                .payUrl(payUrl)
                .signature(signature)
                .createdAt(now)
                .expiresAt(now.plusSeconds(900))
                .build();

        return paymentRepository.save(payment);
    }

    public boolean processCallback(Map<String, String> callbackData) {
        try {
            String transactionRef = callbackData.get("vnp_TxnRef");
            String responseCode = callbackData.get("vnp_ResponseCode");
            String signature = callbackData.get("vnp_SecureHash");

            // Verify signature
            if (!verifyVNPayCallbackSignature(callbackData, signature)) {
                log.error("Invalid VNPay callback signature for transaction: {}", transactionRef);
                return false;
            }

            // Find payment by transaction ID
            Payment payment = paymentRepository.findByTransactionId(transactionRef)
                    .orElseThrow(() -> new RuntimeException("Payment not found"));

            // Check if already processed
            if (payment.getStatus() == Payment.PaymentStatus.SUCCESS) {
                return true;
            }

            // Update payment status
            if ("00".equals(responseCode)) {
                payment.setStatus(Payment.PaymentStatus.SUCCESS);
                payment.setPaidAt(Instant.now());
                payment.setCallbackData(objectMapper.writeValueAsString(callbackData));

                paymentRepository.save(payment);

                // Add balance to user
                User user = userRepository.findById(payment.getUserId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                user.setBalance(user.getBalance() + payment.getAmountVnd());
                userRepository.save(user);

                log.info("VNPay payment successful for transaction: {}, amount: {}", transactionRef, payment.getAmountVnd());
                return true;
            } else {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setCallbackData(objectMapper.writeValueAsString(callbackData));
                paymentRepository.save(payment);
                log.error("VNPay payment failed for transaction: {}, responseCode: {}", transactionRef, responseCode);
                return false;
            }
        } catch (Exception e) {
            log.error("Error processing VNPay callback", e);
            return false;
        }
    }

    private String generateVNPaySignature(Map<String, String> params) {
        try {
            List<String> keys = new ArrayList<>(params.keySet());
            Collections.sort(keys);

            StringBuilder signatureData = new StringBuilder();
            for (String key : keys) {
                if (key.startsWith("vnp_") && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                    signatureData.append(key).append("=").append(params.get(key)).append("&");
                }
            }
            signatureData.deleteCharAt(signatureData.length() - 1); // Remove last &

            Mac mac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKeySpec = new SecretKeySpec(hashSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            mac.init(secretKeySpec);

            byte[] hash = mac.doFinal(signatureData.toString().getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate VNPay signature", e);
        }
    }

    private boolean verifyVNPayCallbackSignature(Map<String, String> callbackData, String signature) {
        try {
            Map<String, String> params = new LinkedHashMap<>(callbackData);
            params.remove("vnp_SecureHash");
            params.remove("vnp_SecureHashType");

            String calculatedSignature = generateVNPaySignature(params);
            return calculatedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying VNPay callback signature", e);
            return false;
        }
    }

    private String buildPaymentUrl(Map<String, String> params) {
        StringBuilder url = new StringBuilder(apiUrl);
        url.append("?");
        
        for (Map.Entry<String, String> entry : params.entrySet()) {
            url.append(entry.getKey()).append("=").append(entry.getValue()).append("&");
        }
        
        url.deleteCharAt(url.length() - 1); // Remove last &
        return url.toString();
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
}
