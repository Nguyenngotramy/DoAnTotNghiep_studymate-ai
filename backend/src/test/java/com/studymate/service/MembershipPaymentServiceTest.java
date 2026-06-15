package com.studymate.service;

import com.studymate.model.MembershipPayment;
import com.studymate.model.MembershipPeriod;
import com.studymate.model.RevenueTransaction;
import com.studymate.model.User;
import com.studymate.repository.AdminSettingRepository;
import com.studymate.repository.MembershipPaymentRepository;
import com.studymate.repository.RevenueTransactionRepository;
import com.studymate.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MembershipPaymentServiceTest {

    private final MembershipPaymentRepository paymentRepo = mock(MembershipPaymentRepository.class);
    private final UserRepository userRepo = mock(UserRepository.class);
    private final AdminSettingRepository adminSettingRepo = mock(AdminSettingRepository.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final RevenueTransactionRepository revenueRepo = mock(RevenueTransactionRepository.class);
    private final MembershipPaymentService service = new MembershipPaymentService(
            paymentRepo,
            userRepo,
            adminSettingRepo,
            notificationService,
            revenueRepo
    );

    @Test
    void approveActivatesRequestedTierForPaymentUser() {
        Instant beforeApproval = Instant.now();
        User user = User.builder()
                .id("user-1")
                .email("user@example.com")
                .fullName("Test User")
                .membershipTier(User.MembershipTier.MEMBER)
                .build();
        MembershipPayment payment = MembershipPayment.builder()
                .id("payment-1")
                .userId("user-1")
                .tier(User.MembershipTier.GOLD)
                .period(MembershipPeriod.MONTH)
                .amountVnd(400_000)
                .status(MembershipPayment.PaymentStatus.PENDING)
                .expiresAt(Instant.now().plusSeconds(1800))
                .build();

        when(paymentRepo.findById("payment-1")).thenReturn(Optional.of(payment));
        when(userRepo.findById("user-1")).thenReturn(Optional.of(user));
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepo.save(any(MembershipPayment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(revenueRepo.save(any(RevenueTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MembershipPayment approved = service.approve("payment-1", "admin-1", "Đã nhận tiền");

        assertEquals(User.MembershipTier.GOLD, user.getMembershipTier());
        assertNotNull(user.getMembershipExpiresAt());
        assertTrue(user.getMembershipExpiresAt().isAfter(beforeApproval.plusSeconds(29L * 24 * 60 * 60)));
        assertEquals(MembershipPayment.PaymentStatus.APPROVED, approved.getStatus());
        assertEquals(user.getMembershipExpiresAt(), approved.getGrantedExpiresAt());
        verify(userRepo).save(user);
        verify(notificationService).send(
                eq("user-1"),
                anyString(),
                anyString(),
                eq("MEMBERSHIP"),
                eq("/membership"),
                eq("admin-1")
        );
    }
}
