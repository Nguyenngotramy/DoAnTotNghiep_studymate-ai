package com.studymate.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "admin_settings")
public class AdminSetting {

    @Id
    private String id;

    @Builder.Default
    private Map<String, Object> values = new LinkedHashMap<>();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
