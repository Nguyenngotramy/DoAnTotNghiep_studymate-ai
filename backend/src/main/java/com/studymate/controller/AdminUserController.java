package com.studymate.controller;

import com.studymate.model.User.MembershipTier;
import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;

    @PostMapping("/{userId}/set-membership")
    public ResponseEntity<?> setMembership(
            @PathVariable String userId,
            @RequestBody Map<String, Object> body
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String tierStr = (String) body.get("tier");
        MembershipTier tier = MembershipTier.valueOf(tierStr.toUpperCase());

        user.setMembershipTier(tier);

        // Set expiry date if tier is not MEMBER
        if (tier != MembershipTier.MEMBER) {
            String periodStr = (String) body.getOrDefault("period", "MONTH");
            Instant expiresAt = switch (periodStr.toUpperCase()) {
                case "WEEK" -> Instant.now().plus(7, java.time.temporal.ChronoUnit.DAYS);
                case "MONTH" -> Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS);
                case "YEAR" -> Instant.now().plus(365, java.time.temporal.ChronoUnit.DAYS);
                default -> Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS);
            };
            user.setMembershipExpiresAt(expiresAt);
        } else {
            user.setMembershipExpiresAt(null);
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Membership tier updated successfully",
                "tier", tier.name(),
                "expiresAt", user.getMembershipExpiresAt()
        ));
    }
}
