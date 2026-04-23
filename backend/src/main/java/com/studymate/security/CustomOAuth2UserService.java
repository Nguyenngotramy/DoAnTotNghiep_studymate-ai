package com.studymate.security;

import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepo;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(request);
        Map<String, Object> attrs = oAuth2User.getAttributes();

        String email    = (String) attrs.get("email");
        String name     = (String) attrs.get("name");
        String picture  = (String) attrs.get("picture");

        // Tìm hoặc tạo user
        User user = userRepo.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .fullName(name != null ? name : email)
                    .avatar(picture)
                    .role(User.Role.USER)
                    .password("")   // OAuth user không cần password
                    .build();
            return userRepo.save(newUser);
        });

        // Cập nhật avatar nếu chưa có
        if (user.getAvatar() == null && picture != null) {
            user.setAvatar(picture);
            userRepo.save(user);
        }

        return oAuth2User;
    }
}