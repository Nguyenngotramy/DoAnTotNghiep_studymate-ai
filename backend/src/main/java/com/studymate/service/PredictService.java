package com.studymate.service;
import com.studymate.dto.request.PredictRequest;
import com.studymate.model.PredictRecord;
import com.studymate.repository.PredictRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.*;

@Service @RequiredArgsConstructor
public class PredictService {

    private final PredictRecordRepository predictRepo;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.ml-service.url}")
    private String mlUrl;

    public Map<String, Object> predict(String userId, PredictRequest req) {
        // Gọi Python ML service
        Map<String, Object> mlResult = webClientBuilder.build()
            .post()
            .uri(mlUrl + "/predict")
            .bodyValue(req)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        if (mlResult == null) mlResult = fallbackPredict(req);

        // Lưu lịch sử
        PredictRecord record = buildRecord(userId, req, mlResult);
        predictRepo.save(record);

        return mlResult;
    }

    public List<PredictRecord> getHistory(String userId) {
        return predictRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    private PredictRecord buildRecord(String userId, PredictRequest req, Map<String, Object> result) {
        return PredictRecord.builder()
            .userId(userId).mode(req.getMode())
            .scores(req.getScores()).targetGrade(req.getTargetGrade())
            .predictedGrade(String.valueOf(result.get("predictedGrade")))
            .gpa(((Number) result.getOrDefault("gpa", 0)).doubleValue())
            .probability(((Number) result.getOrDefault("probability", 0)).doubleValue())
            .advice(String.valueOf(result.get("advice")))
            .build();
    }

    // Fallback khi ML service không khả dụng
    private Map<String, Object> fallbackPredict(PredictRequest req) {
        double gpa = req.getScores().values().stream().mapToDouble(d -> d).average().orElse(5.0);
        String grade = gpa >= 9 ? "XUAT_SAC" : gpa >= 8 ? "GIOI" : gpa >= 7 ? "KHA" : gpa >= 5 ? "TRUNG_BINH" : "YEU";
        return Map.of(
            "predictedGrade", grade, "gpa", Math.round(gpa * 100.0) / 100.0,
            "probability", 70.0, "advice", "Hãy duy trì việc học đều đặn mỗi ngày."
        );
    }
}
