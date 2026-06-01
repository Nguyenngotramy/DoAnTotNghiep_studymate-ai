package com.studymate.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
@Slf4j
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String location = uploadPath.toUri().toString();

        log.info("Serving legacy local uploads from: {}", location);

        // Giữ lại để ảnh cũ trong /uploads vẫn đọc được trên máy đang có file.
        // Ảnh mới sẽ dùng Cloudinary URL nên không còn phụ thuộc local uploads nữa.
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location)
                .setCachePeriod(3600);
    }
}
