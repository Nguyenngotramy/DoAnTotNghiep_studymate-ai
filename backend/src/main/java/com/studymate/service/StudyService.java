package com.studymate.service;

import com.studymate.model.User;
import com.studymate.model.study.StudyPrediction;
import com.studymate.model.study.StudyProfile;
import com.studymate.model.study.StudySubjectRecord;
import com.studymate.model.study.StudyTermRecord;
import com.studymate.repository.UserRepository;
import com.studymate.repository.study.StudyProfileRepository;
import com.studymate.repository.study.StudySubjectRecordRepository;
import com.studymate.repository.study.StudyTermRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudyService {

    private final UserRepository userRepository;
    private final StudyProfileRepository studyProfileRepository;
    private final StudyTermRecordRepository studyTermRecordRepository;
    private final StudySubjectRecordRepository studySubjectRecordRepository;

    public StudyProfile getProfile(String userId) {
        return studyProfileRepository.findByUserId(userId).orElse(null);
    }

    public StudyProfile saveProfile(String userId, StudyProfile input) {
        User user = getUser(userId);

        StudyProfile profile = studyProfileRepository.findByUserId(userId)
                .orElse(StudyProfile.builder()
                        .userId(userId)
                        .createdAt(Instant.now())
                        .build());

        profile.setUserType(input.getUserType());
        profile.setFullName(isBlank(input.getFullName()) ? user.getFullName() : input.getFullName());
        profile.setSchoolName(isBlank(input.getSchoolName()) ? user.getSchool() : input.getSchoolName());

        profile.setClassName(input.getClassName());
        profile.setGradeLevel(input.getGradeLevel());

        profile.setFaculty(input.getFaculty());
        profile.setMajor(input.getMajor());
        profile.setSpecialization(input.getSpecialization());
        profile.setCourseYear(input.getCourseYear());

        profile.setCustomProgramName(input.getCustomProgramName());
        profile.setTargetGoal(input.getTargetGoal());

        profile.setUpdatedAt(Instant.now());

        return studyProfileRepository.save(profile);
    }

    public List<StudyTermRecord> listTerms(String userId) {
        return studyTermRecordRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public StudyTermRecord getTerm(String userId, String termId) {
        return studyTermRecordRepository.findByIdAndUserId(termId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ"));
    }

    public StudyTermRecord createTerm(String userId, StudyTermRecord input) {
        StudyTermRecord term = StudyTermRecord.builder()
                .userId(userId)
                .userType(input.getUserType())
                .academicYear(input.getAcademicYear())
                .semesterType(input.getSemesterType())
                .semesterLabel(input.getSemesterLabel())
                .isCurrent(Boolean.TRUE.equals(input.getIsCurrent()))
                .fullName(input.getFullName())
                .schoolName(input.getSchoolName())
                .className(input.getClassName())
                .gradeLevel(input.getGradeLevel())
                .faculty(input.getFaculty())
                .major(input.getMajor())
                .specialization(input.getSpecialization())
                .courseYear(input.getCourseYear())
                .customProgramName(input.getCustomProgramName())
                .targetGoal(input.getTargetGoal())
                .behaviorRating(input.getBehaviorRating())
                .note(input.getNote())
                .averageScore(defaultDouble(input.getAverageScore()))
                .gpa10(input.getGpa10())
                .gpa4(input.getGpa4())
                .classification(input.getClassification())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return studyTermRecordRepository.save(term);
    }

    public StudyTermRecord updateTerm(String userId, String termId, StudyTermRecord input) {
        StudyTermRecord term = getTerm(userId, termId);

        term.setUserType(input.getUserType());
        term.setAcademicYear(input.getAcademicYear());
        term.setSemesterType(input.getSemesterType());
        term.setSemesterLabel(input.getSemesterLabel());
        term.setIsCurrent(Boolean.TRUE.equals(input.getIsCurrent()));

        term.setFullName(input.getFullName());
        term.setSchoolName(input.getSchoolName());
        term.setClassName(input.getClassName());
        term.setGradeLevel(input.getGradeLevel());

        term.setFaculty(input.getFaculty());
        term.setMajor(input.getMajor());
        term.setSpecialization(input.getSpecialization());
        term.setCourseYear(input.getCourseYear());

        term.setCustomProgramName(input.getCustomProgramName());
        term.setTargetGoal(input.getTargetGoal());

        term.setBehaviorRating(input.getBehaviorRating());
        term.setNote(input.getNote());

        term.setAverageScore(input.getAverageScore());
        term.setGpa10(input.getGpa10());
        term.setGpa4(input.getGpa4());
        term.setClassification(input.getClassification());

        term.setUpdatedAt(Instant.now());

        return studyTermRecordRepository.save(term);
    }

    public void deleteTerm(String userId, String termId) {
        StudyTermRecord term = getTerm(userId, termId);
        studySubjectRecordRepository.deleteByTermIdAndUserId(term.getId(), userId);
        studyTermRecordRepository.delete(term);
    }

    public List<StudySubjectRecord> listSubjects(String userId, String termId) {
        getTerm(userId, termId);
        return studySubjectRecordRepository.findByTermIdAndUserIdOrderByCreatedAtAsc(termId, userId);
    }

    public List<StudySubjectRecord> saveSubjects(String userId, String termId, List<StudySubjectRecord> input) {
        StudyTermRecord term = getTerm(userId, termId);

        studySubjectRecordRepository.deleteByTermIdAndUserId(termId, userId);

        List<StudySubjectRecord> rows = new ArrayList<>();

        for (StudySubjectRecord item : input) {
            double average = computeSubjectAverage(item);

            String letterGrade = null;
            if ("STUDENT".equalsIgnoreCase(term.getUserType())) {
                letterGrade = toLetterGrade(average);
            }

            String status = average >= 4.0 ? "pass" : "fail";

            StudySubjectRecord subject = StudySubjectRecord.builder()
                    .termId(termId)
                    .userId(userId)
                    .userType(term.getUserType())
                    .subjectName(item.getSubjectName())
                    .credits(item.getCredits())
                    .regularScores(item.getRegularScores() == null ? new ArrayList<>() : item.getRegularScores())
                    .midtermScore(item.getMidtermScore())
                    .finalScore(item.getFinalScore())
                    .attendanceScore(item.getAttendanceScore())
                    .assignmentScore(item.getAssignmentScore())
                    .projectScore(item.getProjectScore())
                    .customScores(item.getCustomScores() == null ? new ArrayList<>() : item.getCustomScores())
                    .averageScore(round2(average))
                    .letterGrade(letterGrade)
                    .status(status)
                    .note(item.getNote())
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            rows.add(subject);
        }

        List<StudySubjectRecord> saved = studySubjectRecordRepository.saveAll(rows);
        recomputeTermSummary(userId, termId);
        return saved;
    }

    public StudyTermRecord recomputeTermSummary(String userId, String termId) {
        StudyTermRecord term = getTerm(userId, termId);
        List<StudySubjectRecord> subjects = studySubjectRecordRepository.findByTermIdAndUserIdOrderByCreatedAtAsc(termId, userId);

        if (subjects.isEmpty()) {
            term.setAverageScore(0.0);
            term.setGpa10(0.0);
            term.setGpa4(0.0);
            term.setClassification("Chưa có dữ liệu");
            term.setUpdatedAt(Instant.now());
            return studyTermRecordRepository.save(term);
        }

        if ("STUDENT".equalsIgnoreCase(term.getUserType())) {
            int totalCredits = subjects.stream()
                    .map(s -> s.getCredits() == null ? 0 : s.getCredits())
                    .reduce(0, Integer::sum);

            double weighted10 = subjects.stream()
                    .mapToDouble(s -> defaultDouble(s.getAverageScore()) * (s.getCredits() == null ? 0 : s.getCredits()))
                    .sum();

            double weighted4 = subjects.stream()
                    .mapToDouble(s -> toGpa4(defaultDouble(s.getAverageScore())) * (s.getCredits() == null ? 0 : s.getCredits()))
                    .sum();

            double gpa10 = totalCredits == 0 ? 0 : weighted10 / totalCredits;
            double gpa4 = totalCredits == 0 ? 0 : weighted4 / totalCredits;

            term.setAverageScore(round2(gpa10));
            term.setGpa10(round2(gpa10));
            term.setGpa4(round2(gpa4));
            term.setClassification(classifyUniversity(gpa4));
        } else if ("HIGHSCHOOL".equalsIgnoreCase(term.getUserType())) {
            double avg = subjects.stream()
                    .mapToDouble(s -> defaultDouble(s.getAverageScore()))
                    .average()
                    .orElse(0);

            term.setAverageScore(round2(avg));
            term.setGpa10(round2(avg));
            term.setGpa4(null);
            term.setClassification(classifyHighschool(avg));
        } else {
            double avg = subjects.stream()
                    .mapToDouble(s -> defaultDouble(s.getAverageScore()))
                    .average()
                    .orElse(0);

            term.setAverageScore(round2(avg));
            term.setGpa10(round2(avg));
            term.setGpa4(null);
            term.setClassification(classifyOther(avg));
        }

        term.setUpdatedAt(Instant.now());
        return studyTermRecordRepository.save(term);
    }

    public StudyPrediction predict(String userId) {
        List<StudyTermRecord> terms = studyTermRecordRepository.findByUserIdOrderByUpdatedAtDesc(userId);

        if (terms.isEmpty()) {
            return StudyPrediction.builder()
                    .predictedAverage(0.0)
                    .predictedClassification("Chưa có dữ liệu")
                    .confidenceLevel("low")
                    .weakSubjects(new ArrayList<>())
                    .strongSubjects(new ArrayList<>())
                    .suggestions(List.of("Hãy lưu ít nhất một học kỳ để bắt đầu dự đoán."))
                    .warnings(List.of("Chưa đủ dữ liệu học tập."))
                    .build();
        }

        StudyTermRecord latest = terms.get(0);
        List<StudySubjectRecord> latestSubjects = studySubjectRecordRepository
                .findByTermIdAndUserIdOrderByCreatedAtAsc(latest.getId(), userId);

        if (latestSubjects.isEmpty()) {
            return StudyPrediction.builder()
                    .predictedAverage(0.0)
                    .predictedClassification("Chưa có dữ liệu")
                    .confidenceLevel("low")
                    .weakSubjects(new ArrayList<>())
                    .strongSubjects(new ArrayList<>())
                    .suggestions(List.of("Hãy nhập bảng điểm của học kỳ gần nhất."))
                    .warnings(List.of("Chưa có môn học nào để phân tích."))
                    .build();
        }

        Map<String, Double> previousMap = new HashMap<>();
        if (terms.size() > 1) {
            StudyTermRecord prevTerm = terms.get(1);
            List<StudySubjectRecord> prevSubjects = studySubjectRecordRepository
                    .findByTermIdAndUserIdOrderByCreatedAtAsc(prevTerm.getId(), userId);
            for (StudySubjectRecord s : prevSubjects) {
                previousMap.put(s.getSubjectName(), defaultDouble(s.getAverageScore()));
            }
        }

        List<SubjectTrend> subjectTrends = latestSubjects.stream()
                .map(s -> new SubjectTrend(
                        s.getSubjectName(),
                        defaultDouble(s.getAverageScore()),
                        previousMap.get(s.getSubjectName())
                ))
                .toList();

        double predictedAverageBase = subjectTrends.stream()
                .mapToDouble(SubjectTrend::score)
                .average()
                .orElse(0);

        double trendBoost = subjectTrends.stream()
                .mapToDouble(tr -> tr.previousScore() == null ? 0 : (tr.score() - tr.previousScore()) * 0.2)
                .average()
                .orElse(0);

        double predictedAverage = Math.max(0, Math.min(10, predictedAverageBase + trendBoost));
        predictedAverage = round2(predictedAverage);

        String predictedClassification;
        if ("STUDENT".equalsIgnoreCase(latest.getUserType())) {
            predictedClassification = classifyUniversity(toGpa4(predictedAverage));
        } else if ("HIGHSCHOOL".equalsIgnoreCase(latest.getUserType())) {
            predictedClassification = classifyHighschool(predictedAverage);
        } else {
            predictedClassification = classifyOther(predictedAverage);
        }

        List<String> weakSubjects = subjectTrends.stream()
                .filter(s -> s.score() < 6.5)
                .sorted(Comparator.comparingDouble(SubjectTrend::score))
                .limit(3)
                .map(SubjectTrend::name)
                .collect(Collectors.toList());

        List<String> strongSubjects = subjectTrends.stream()
                .filter(s -> s.score() >= 8.0)
                .sorted((a, b) -> Double.compare(b.score(), a.score()))
                .limit(3)
                .map(SubjectTrend::name)
                .collect(Collectors.toList());

        List<String> warnings = new ArrayList<>();
        if (!weakSubjects.isEmpty()) {
            warnings.add("Bạn đang yếu nhất ở: " + String.join(", ", weakSubjects) + ".");
        }
        if (predictedAverage < 6.5) {
            warnings.add("Nếu giữ tiến độ hiện tại, kết quả kỳ tới có thể chưa cao.");
        }
        if (warnings.isEmpty()) {
            warnings.add("Tiến độ hiện tại khá ổn định, hãy duy trì nhịp học đều.");
        }

        List<String> suggestions = new ArrayList<>();
        if (!weakSubjects.isEmpty()) {
            suggestions.add("Ưu tiên ôn trước các môn: " + String.join(", ", weakSubjects) + ".");
        }
        suggestions.add("Mỗi tuần nên chia thời gian học thành các buổi ngắn nhưng đều đặn.");
        suggestions.add("Sau mỗi 1-2 tuần, hãy cập nhật lại điểm để hệ thống dự đoán chính xác hơn.");
        if (!strongSubjects.isEmpty()) {
            suggestions.add("Giữ phong độ ở các môn mạnh: " + String.join(", ", strongSubjects) + ".");
        }

        String confidenceLevel = terms.size() >= 3 ? "high" : terms.size() >= 2 ? "medium" : "low";

        return StudyPrediction.builder()
                .predictedAverage(predictedAverage)
                .predictedClassification(predictedClassification)
                .confidenceLevel(confidenceLevel)
                .weakSubjects(weakSubjects)
                .strongSubjects(strongSubjects)
                .suggestions(suggestions)
                .warnings(warnings)
                .build();
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
    }

    private double computeSubjectAverage(StudySubjectRecord s) {
        if ("HIGHSCHOOL".equalsIgnoreCase(s.getUserType())) {
            List<Double> regularScores = s.getRegularScores() == null ? new ArrayList<>() : s.getRegularScores();
            double regularAvg = regularScores.isEmpty()
                    ? 0
                    : regularScores.stream().mapToDouble(this::defaultDouble).average().orElse(0);

            double mid = defaultDouble(s.getMidtermScore());
            double fin = defaultDouble(s.getFinalScore());

            return (regularAvg + mid * 2 + fin * 3) / 6.0;
        }

        if ("STUDENT".equalsIgnoreCase(s.getUserType())) {
            double attendance = defaultDouble(s.getAttendanceScore());
            double assignment = defaultDouble(s.getAssignmentScore());
            double mid = defaultDouble(s.getMidtermScore());
            double fin = defaultDouble(s.getFinalScore());

            return attendance * 0.1 + assignment * 0.2 + mid * 0.2 + fin * 0.5;
        }

        if (s.getCustomScores() != null && !s.getCustomScores().isEmpty()) {
            double totalWeight = s.getCustomScores().stream()
                    .mapToDouble(cs -> cs.getWeight() == null ? 1.0 : cs.getWeight())
                    .sum();

            double total = s.getCustomScores().stream()
                    .mapToDouble(cs -> defaultDouble(cs.getValue()) * (cs.getWeight() == null ? 1.0 : cs.getWeight()))
                    .sum();

            return totalWeight == 0 ? 0 : total / totalWeight;
        }

        return (defaultDouble(s.getMidtermScore()) + defaultDouble(s.getFinalScore())) / 2.0;
    }

    private String toLetterGrade(double score) {
        if (score >= 8.5) return "A";
        if (score >= 7.0) return "B";
        if (score >= 5.5) return "C";
        if (score >= 4.0) return "D";
        return "F";
    }

    private double toGpa4(double score) {
        if (score >= 8.5) return 4.0;
        if (score >= 7.0) return 3.0;
        if (score >= 5.5) return 2.0;
        if (score >= 4.0) return 1.0;
        return 0.0;
    }

    private String classifyHighschool(double avg) {
        if (avg >= 8.0) return "Giỏi";
        if (avg >= 6.5) return "Khá";
        if (avg >= 5.0) return "Trung bình";
        return "Yếu";
    }

    private String classifyUniversity(double gpa4) {
        if (gpa4 >= 3.6) return "Xuất sắc";
        if (gpa4 >= 3.2) return "Giỏi";
        if (gpa4 >= 2.5) return "Khá";
        if (gpa4 >= 2.0) return "Trung bình";
        return "Cảnh báo";
    }

    private String classifyOther(double avg) {
        if (avg >= 8.0) return "Tốt";
        if (avg >= 6.5) return "Ổn";
        if (avg >= 5.0) return "Cần cải thiện";
        return "Yếu";
    }

    private double defaultDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private double round2(double n) {
        return Math.round(n * 100.0) / 100.0;
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private record SubjectTrend(String name, double score, Double previousScore) {
    }
}