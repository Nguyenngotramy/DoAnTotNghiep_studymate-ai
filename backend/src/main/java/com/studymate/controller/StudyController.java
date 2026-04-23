package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.study.StudyProfile;
import com.studymate.model.study.StudyPrediction;
import com.studymate.model.study.StudySubjectRecord;
import com.studymate.model.study.StudyTermRecord;
import com.studymate.service.StudyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/study")
@RequiredArgsConstructor
public class StudyController {

    private final StudyService studyService;

    @GetMapping("/profile/me")
    public ResponseEntity<?> getMyProfile(Authentication auth) {
        StudyProfile profile = studyService.getProfile(auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }

    @PutMapping("/profile/me")
    public ResponseEntity<?> saveMyProfile(
            Authentication auth,
            @RequestBody StudyProfile body
    ) {
        StudyProfile saved = studyService.saveProfile(auth.getName(), body);
        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã lưu hồ sơ học tập"));
    }

    @GetMapping("/terms")
    public ResponseEntity<?> listTerms(Authentication auth) {
        List<StudyTermRecord> terms = studyService.listTerms(auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(terms));
    }

    @GetMapping("/terms/{termId}")
    public ResponseEntity<?> getTerm(
            @PathVariable String termId,
            Authentication auth
    ) {
        StudyTermRecord term = studyService.getTerm(auth.getName(), termId);
        return ResponseEntity.ok(ApiResponse.ok(term));
    }

    @PostMapping("/terms")
    public ResponseEntity<?> createTerm(
            Authentication auth,
            @RequestBody StudyTermRecord body
    ) {
        StudyTermRecord saved = studyService.createTerm(auth.getName(), body);
        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã tạo học kỳ"));
    }

    @PutMapping("/terms/{termId}")
    public ResponseEntity<?> updateTerm(
            @PathVariable String termId,
            Authentication auth,
            @RequestBody StudyTermRecord body
    ) {
        StudyTermRecord saved = studyService.updateTerm(auth.getName(), termId, body);
        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã cập nhật học kỳ"));
    }

    @DeleteMapping("/terms/{termId}")
    public ResponseEntity<?> deleteTerm(
            @PathVariable String termId,
            Authentication auth
    ) {
        studyService.deleteTerm(auth.getName(), termId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá học kỳ"));
    }

    @GetMapping("/terms/{termId}/subjects")
    public ResponseEntity<?> listSubjects(
            @PathVariable String termId,
            Authentication auth
    ) {
        List<StudySubjectRecord> subjects = studyService.listSubjects(auth.getName(), termId);
        return ResponseEntity.ok(ApiResponse.ok(subjects));
    }

    @PutMapping("/terms/{termId}/subjects")
    public ResponseEntity<?> saveSubjects(
            @PathVariable String termId,
            Authentication auth,
            @RequestBody List<StudySubjectRecord> body
    ) {
        List<StudySubjectRecord> saved = studyService.saveSubjects(auth.getName(), termId, body);
        return ResponseEntity.ok(ApiResponse.ok(saved, "Đã lưu bảng điểm"));
    }

    @PostMapping("/terms/{termId}/recompute")
    public ResponseEntity<?> recomputeTerm(
            @PathVariable String termId,
            Authentication auth
    ) {
        StudyTermRecord updated = studyService.recomputeTermSummary(auth.getName(), termId);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Đã tính lại kết quả học kỳ"));
    }

    @GetMapping("/predict")
    public ResponseEntity<?> predict(Authentication auth) {
        StudyPrediction prediction = studyService.predict(auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(prediction));
    }
}