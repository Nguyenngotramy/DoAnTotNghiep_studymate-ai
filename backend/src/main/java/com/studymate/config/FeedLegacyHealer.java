package com.studymate.config;

import com.studymate.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Một lần khi khởi động: chuẩn hóa bài cũ để mọi tài khoản thấy trên feed. */
@Component
@RequiredArgsConstructor
@Slf4j
public class FeedLegacyHealer {

    private final PostService postService;

    @EventListener(ApplicationReadyEvent.class)
    public void healLegacyPostsOnStartup() {
        try {
            int fixed = postService.healLegacyPublishedPostsOnly();
            if (fixed > 0) {
                log.info("Feed: đã chuẩn hóa {} bài cũ để hiển thị công khai", fixed);
            }
        } catch (Exception e) {
            log.warn("Feed legacy heal skipped: {}", e.getMessage());
        }
    }
}
