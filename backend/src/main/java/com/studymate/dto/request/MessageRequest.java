package com.studymate.dto.request;
import lombok.Data;
@Data public class MessageRequest {
    private String content;
    private String type = "TEXT";
}
