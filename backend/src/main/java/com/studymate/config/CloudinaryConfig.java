package com.studymate.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        String cleanCloudName = clean(cloudName);
        String cleanApiKey = clean(apiKey);
        String cleanApiSecret = clean(apiSecret);

        if (cleanCloudName.isBlank()) {
            throw new IllegalStateException("Missing CLOUDINARY_CLOUD_NAME");
        }

        if (cleanApiKey.isBlank()) {
            throw new IllegalStateException("Missing CLOUDINARY_API_KEY");
        }

        if (cleanApiSecret.isBlank()) {
            throw new IllegalStateException("Missing CLOUDINARY_API_SECRET");
        }

        Map<String, Object> config = ObjectUtils.asMap(
                "cloud_name", cleanCloudName,
                "api_key", cleanApiKey,
                "api_secret", cleanApiSecret,
                "secure", true
        );

        return new Cloudinary(config);
    }

    private String clean(String value) {
        if (value == null) return "";

        return value
                .trim()
                .replace("\"", "")
                .replace("'", "");
    }
}