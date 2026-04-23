package com.studymate.dto.request;
import lombok.Data;
import java.util.*;
@Data public class PredictRequest {
    private String mode; // cap3 | sv
    private Map<String, Double> scores;
    private String khoi;
    private Double uuTienKV = 0.0;
    private Double uuTienDT = 0.0;
    private String targetGrade = "GIOI";
    private Integer hoursPerWeek = 21;
    private Integer weeksLeft = 12;
    private Integer attendance = 90;
    private Integer redoCount = 0;
}
