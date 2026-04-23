package com.studymate.security;

import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final UserRepository userRepo;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        if (email == null || email.isBlank()) {
            response.sendRedirect(frontendUrl + "/login?oauth_error=missing_email");
            return;
        }

        User user = userRepo.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .fullName(name != null && !name.isBlank() ? name : email.split("@")[0])
                    .avatar(picture)
                    .password("")
                    .role(User.Role.USER)
                    .onboardingDone(false)
                    .xp(50)
                    .build();
            return userRepo.save(newUser);
        });

        if ((user.getAvatar() == null || user.getAvatar().isBlank()) && picture != null && !picture.isBlank()) {
            user.setAvatar(picture);
            userRepo.save(user);
        }

        String mongoId = user.getId();
        System.out.println("[OAuth2] MongoDB _id: " + mongoId + " / email: " + email);

        String accessToken = jwtService.generateAccessToken(mongoId, user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(mongoId);

        String encodedAccess = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(accessToken.getBytes(StandardCharsets.UTF_8));

        String encodedRefresh = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(refreshToken.getBytes(StandardCharsets.UTF_8));

        String redirectUrl = frontendUrl + "/oauth2/callback?at=" + encodedAccess + "&rt=" + encodedRefresh;

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}