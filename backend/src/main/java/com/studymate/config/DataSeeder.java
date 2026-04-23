package com.studymate.config;
import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor @Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;

    @Value("${app.admin.email}")    private String adminEmail;
    @Value("${app.admin.password}") private String adminPassword;
    @Value("${app.admin.fullName}") private String adminName;

    @Override
    public void run(String... args) {
        if (!userRepo.existsByEmail(adminEmail)) {
            userRepo.save(User.builder()
                .email(adminEmail)
                .password(encoder.encode(adminPassword))
                .fullName(adminName)
                .role(User.Role.ADMIN)
                .build());
            log.info("✅ Admin account created: {}", adminEmail);
        } else {
            log.info("ℹ️  Admin already exists: {}", adminEmail);
        }
    }
}
