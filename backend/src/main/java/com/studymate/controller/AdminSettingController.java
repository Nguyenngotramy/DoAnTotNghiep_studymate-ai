package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.AdminSetting;
import com.studymate.repository.AdminSettingRepository;
import com.studymate.service.MembershipPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/settings/config")
@RequiredArgsConstructor
public class AdminSettingController {

    private static final String DEFAULT_ID = "default";

    private final AdminSettingRepository adminSettingRepo;

    @GetMapping
    public ResponseEntity<?> getAdminSettings() {
        AdminSetting setting = adminSettingRepo.findById(DEFAULT_ID)
                .orElseGet(() -> {
                    AdminSetting created = new AdminSetting();
                    created.setId(DEFAULT_ID);
                    created.setValues(defaultAdminSettings());
                    created.setUpdatedAt(Instant.now());
                    return adminSettingRepo.save(created);
                });

        return ResponseEntity.ok(ApiResponse.ok(setting.getValues()));
    }

    @PutMapping
    public ResponseEntity<?> saveAdminSettings(@RequestBody Map<String, Object> values) {
        AdminSetting setting = adminSettingRepo.findById(DEFAULT_ID)
                .orElseGet(() -> {
                    AdminSetting created = new AdminSetting();
                    created.setId(DEFAULT_ID);
                    return created;
                });

        setting.setValues(values == null ? defaultAdminSettings() : values);
        setting.setUpdatedAt(Instant.now());

        AdminSetting saved = adminSettingRepo.save(setting);

        return ResponseEntity.ok(ApiResponse.ok(saved.getValues(), "Đã lưu cài đặt hệ thống"));
    }

    private Map<String, Object> defaultAdminSettings() {
        Map<String, Object> values = new LinkedHashMap<>();

        values.put("weakGpaThreshold", 5.5);
        values.put("criticalGpaThreshold", 4.5);
        values.put("infoGpaThreshold", 6.5);

        values.put("enableAdminAlerts", true);
        values.put("alertOnWeakLearner", true);
        values.put("alertOnReportedPost", true);
        values.put("alertOnReportedDocument", true);
        values.put("alertOnOverdueTask", true);

        values.put("defaultRequirePostApproval", false);

        values.put("autoReviewReportedDocument", true);
        values.put("documentReportLimit", 3);
        values.put("blockRejectedDocument", true);

        values.put("supportReminderTitle", "Hỗ trợ học tập từ StudyMate AI");
        values.put(
                "supportReminderMessage",
                "Kết quả gần đây cho thấy bạn có thể cần thêm hỗ trợ học tập. Hãy xem lại tài liệu, quiz và nhóm học phù hợp để cải thiện dần nhé."
        );

        values.put("infoLabel", "Cần theo dõi thêm");
        values.put("warningLabel", "Nguy cơ học lực giảm");
        values.put("criticalLabel", "Cần can thiệp sớm");

        values.put("mlServiceUrl", "http://localhost:8000");
        values.put("mlHealthEndpoint", "/health");

        values.put("maxFileUploadMb", 25);
        values.put("allowedFileTypes", "PDF,DOC,DOCX,PPT,PPTX,TXT,PNG,JPG,JPEG,ZIP");

        values.put("membershipBank", MembershipPaymentService.defaultBank());
        values.put("membershipPricing", MembershipPaymentService.defaultPricing());
        values.put("membershipLimits", MembershipPaymentService.defaultLimits());

        return values;
    }
}
