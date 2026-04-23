package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<?> stats(Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(dashboardService.getStats(auth.getName()))
        );
    }

    @GetMapping("/activity")
    public ResponseEntity<?> activity(Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok(dashboardService.getActivity(auth.getName()))
        );
    }

    @GetMapping("/feed")
    public ResponseEntity<?> feed(@RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(
                ApiResponse.ok(dashboardService.getFeed(page))
        );
    }
}