package com.studymate.security;

import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import com.studymate.service.UserAccountLockService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final UserAccountLockService accountLockService;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String authHeader = req.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(req, res);
            return;
        }

        String token = authHeader.substring(7);

        if (!jwtService.isValid(token)) {
            chain.doFilter(req, res);
            return;
        }

        String userId = jwtService.extractUserId(token);
        String tokenRole = jwtService.extractRole(token);

        if (userId == null || SecurityContextHolder.getContext().getAuthentication() != null) {
            chain.doFilter(req, res);
            return;
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            SecurityContextHolder.clearContext();
            unauthorized(res, "Người dùng không tồn tại");
            return;
        }

        User user = userOpt.get();
        user = accountLockService.resolveLockState(user);

        if (accountLockService.isAccessBlocked(user)) {
            SecurityContextHolder.clearContext();
            unauthorized(res, accountLockService.blockMessage(user));
            return;
        }

        String effectiveRole = user.getRole() != null ? user.getRole().name() : tokenRole;
        var auth = new UsernamePasswordAuthenticationToken(
                user.getId(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + effectiveRole))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        chain.doFilter(req, res);
    }

    private void unauthorized(HttpServletResponse res, String message) throws IOException {
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("""
                {"success":false,"message":"%s"}
                """.formatted(escapeJson(message)));
    }

    private String escapeJson(String s) {
        return s == null ? "" : s.replace("\"", "\\\"");
    }
}