package com.studymate.dto;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;
    public static <T> ApiResponse<T> ok(T data)               { return new ApiResponse<>(true, data, null); }
    public static <T> ApiResponse<T> ok(T data, String msg)   { return new ApiResponse<>(true, data, msg); }
    public static <T> ApiResponse<T> error(String msg)        { return new ApiResponse<>(false, null, msg); }
}
