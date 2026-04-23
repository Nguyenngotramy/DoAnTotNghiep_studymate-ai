package com.studymate.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class RegisterRequest {

    @NotBlank(message = "Họ tên không được trống")
    @Size(min = 2, message = "Họ tên tối thiểu 2 ký tự")
    private String fullName;

    @Email(message = "Email không hợp lệ")
    @NotBlank(message = "Email không được trống")
    private String email;

    @NotBlank(message = "Mật khẩu không được trống")
    @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
    private String password;

    private String studentCode;

    // ── Onboarding step 2 ─────────────────────────────────
    private String userType;          // STUDENT | HIGHSCHOOL | TEACHER | OTHER
    private String school;

    // ── Onboarding step 3 ─────────────────────────────────
    private List<String> strongSubjects;   // môn giỏi → skill level 3
    private List<String> weakSubjects;     // môn yếu  → skill level 1
    private String       goal;
}