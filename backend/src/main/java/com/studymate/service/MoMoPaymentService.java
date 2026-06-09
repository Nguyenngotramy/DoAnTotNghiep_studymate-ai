package com.studymate.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studymate.model.Payment;
import com.studymate.model.User;
import com.studymate.repository.PaymentRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MoMoPaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${payment.momo.partner-code}")
    private String partnerCode;

    @Value("${payment.momo.access-key}")
    private String accessKey;

    @Value("${payment.momo.secret-key}")
    private String secretKey;

    @Value("${payment.momo.api-endpoint}")
    private String apiEndpoint;

    @Value("${payment.momo.redirect-url}")
    private String redirectUrl;

    @Value("${payment.momo.ipn-url}")
    private String ipnUrl;

    public Payment createPayment(String userId, long amountVnd) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String orderId = "SM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String requestId = UUID.randomUUID().toString().replace("-", "");

        // Build MoMo request
        Map<String, String> requestData = new LinkedHashMap<>();
        requestData.put("partnerCode", partnerCode);
        requestData.put("partnerName", "StudyMate");
        requestData.put("storeId", "StudyMateStore");
        requestData.put("requestId", requestId);
        requestData.put("amount", String.valueOf(amountVnd));
        requestData.put("orderInfo", "Nạp tiền vào tài khoản StudyMate");
        requestData.put("redirectUrl", redirectUrl);
        requestData.put("ipnUrl", ipnUrl);
        requestData.put("requestType", "captureWallet");
        requestData.put("extraData", "");
        requestData.put("orderId", orderId);

        String signature = generateSignature(requestData);
        requestData.put("signature", signature);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestData, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    apiEndpoint,
                    entity,
                    String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String payUrl = responseBody.get("payUrl").asText();

            // Save payment record
            Payment payment = Payment.builder()
                    .userId(userId)
                    .userEmail(user.getEmail())
                    .userFullName(user.getFullName())
                    .provider(Payment.PaymentProvider.MOMO)
                    .status(Payment.PaymentStatus.PENDING)
                    .amountVnd(amountVnd)
                    .orderId(orderId)
                    .payUrl(payUrl)
                    .signature(signature)
                    .createdAt(Instant.now())
                    .expiresAt(Instant.now().plusSeconds(900)) // 15 minutes
                    .build();

            return paymentRepository.save(payment);

        } catch (Exception e) {
            log.error("Error creating MoMo payment", e);
            throw new RuntimeException("Failed to create payment");
        }
    }

    public boolean processCallback(Map<String, String> callbackData) {
        try {
            String orderId = callbackData.get("orderId");
            String transactionId = callbackData.get("transId");
            int resultCode = Integer.parseInt(callbackData.get("resultCode"));
            String signature = callbackData.get("signature");

            // Verify signature
            if (!verifyCallbackSignature(callbackData, signature)) {
                log.error("Invalid MoMo callback signature for order: {}", orderId);
                return false;
            }

            // Find payment
            Payment payment = paymentRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Payment not found"));

            // Check if already processed
            if (payment.getStatus() == Payment.PaymentStatus.SUCCESS) {
                return true;
            }

            // Update payment status
            if (resultCode == 0) {
                payment.setStatus(Payment.PaymentStatus.SUCCESS);
                payment.setTransactionId(transactionId);
                payment.setPaidAt(Instant.now());
                payment.setCallbackData(objectMapper.writeValueAsString(callbackData));

                paymentRepository.save(payment);

                // Add balance to user
                User user = userRepository.findById(payment.getUserId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                user.setBalance(user.getBalance() + payment.getAmountVnd());
                userRepository.save(user);

                log.info("Payment successful for order: {}, amount: {}", orderId, payment.getAmountVnd());
                return true;
            } else {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setCallbackData(objectMapper.writeValueAsString(callbackData));
                paymentRepository.save(payment);
                log.error("Payment failed for order: {}, resultCode: {}", orderId, resultCode);
                return false;
            }
        } catch (Exception e) {
            log.error("Error processing MoMo callback", e);
            return false;
        }
    }

    private String generateSignature(Map<String, String> data) {
        try {
            List<String> keys = new ArrayList<>(data.keySet());
            Collections.sort(keys);

            StringBuilder signatureData = new StringBuilder();
            for (String key : keys) {
                if (!key.equals("signature")) {
                    signatureData.append(key).append("=").append(data.get(key)).append("&");
                }
            }
            signatureData.deleteCharAt(signatureData.length() - 1); // Remove last &

            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);

            byte[] hash = mac.doFinal(signatureData.toString().getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate signature", e);
        }
    }

    private boolean verifyCallbackSignature(Map<String, String> callbackData, String signature) {
        try {
            String rawData = callbackData.get("data");
            MessageDigest md = MessageDigest.getInstance("SHA-512");
            byte[] hash = md.digest(rawData.getBytes(StandardCharsets.UTF_8));
            String calculatedSignature = bytesToHex(hash);
            return calculatedSignature.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying callback signature", e);
            return false;
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
}
