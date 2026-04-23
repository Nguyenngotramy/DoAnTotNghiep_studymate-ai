package com.studymate.controller;
import com.studymate.dto.*;
import com.studymate.dto.request.PredictRequest;
import com.studymate.service.PredictService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/predict") @RequiredArgsConstructor
public class PredictController {

    private final PredictService predictService;

    @PostMapping
    public ResponseEntity<?> predict(Authentication auth, @RequestBody PredictRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(predictService.predict(auth.getName(), req)));
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(predictService.getHistory(auth.getName())));
    }
}
