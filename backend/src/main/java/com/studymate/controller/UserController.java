package com.studymate.controller;

import com.studymate.dto.ApiResponse;
import com.studymate.model.User;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepo;

    private static final List<String> HIGHSCHOOL_SUBJECTS = List.of(
            "Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học",
            "Lịch sử", "Địa lý", "GDCD", "Tin học", "IELTS", "TOEIC"
    );

    private static final List<String> UNIVERSITY_SUBJECTS = List.of(
            "Lập trình", "Cấu trúc dữ liệu", "Cơ sở dữ liệu", "AI/ML", "Web Development",
            "Mobile Development", "Mạng máy tính", "An toàn thông tin", "Kinh tế vi mô",
            "Kinh tế vĩ mô", "Marketing", "Kế toán", "Xác suất thống kê", "Tiếng Anh",
            "IELTS", "TOEIC", "Toán cao cấp", "Vật lý đại cương"
    );

    private static final List<String> UNIVERSITY_MAJORS = List.of(
            "Cong nghe thong tin", "Khoa hoc may tinh", "Ky thuat phan mem", "Tri tue nhan tao",
            "An toan thong tin", "He thong thong tin", "Marketing", "Quan tri kinh doanh",
            "Ke toan - Kiem toan", "Tai chinh - Ngan hang", "Kinh te", "Ngon ngu Anh",
            "Thiet ke do hoa", "Y da khoa", "Duoc hoc", "Dieu duong", "Su pham", "Luat",
            "Co khi", "Dien - Dien tu", "Xay dung", "Logistics", "Du lich - Khach san"
    );

    private static final Map<String, List<String>> MAJOR_SUBJECTS = Map.ofEntries(
            Map.entry("cong nghe thong tin", List.of("Lap trinh", "Cau truc du lieu", "Co so du lieu", "Web Development", "Mobile Development", "Mang may tinh", "He dieu hanh", "Git/GitHub")),
            Map.entry("khoa hoc may tinh", List.of("Toan roi rac", "Cau truc du lieu", "Giai thuat", "AI/ML", "Khai pha du lieu", "Xac suat thong ke", "Python", "Nghien cuu khoa hoc")),
            Map.entry("ky thuat phan mem", List.of("Phan tich thiet ke he thong", "Kiem thu phan mem", "Quan ly du an", "Web Development", "Mobile Development", "UI/UX", "DevOps", "Co so du lieu")),
            Map.entry("tri tue nhan tao", List.of("Python", "Machine Learning", "Deep Learning", "Xu ly ngon ngu tu nhien", "Thi giac may tinh", "Xac suat thong ke", "Dai so tuyen tinh", "Du lieu lon")),
            Map.entry("an toan thong tin", List.of("Mang may tinh", "Bao mat web", "Mat ma hoc", "Pentest", "Linux", "Forensics", "An toan he thong", "Lap trinh")),
            Map.entry("marketing", List.of("Marketing can ban", "Digital Marketing", "SEO", "Content Marketing", "Hanh vi khach hang", "Phan tich du lieu", "Thuong hieu", "Truyen thong")),
            Map.entry("quan tri kinh doanh", List.of("Quan tri hoc", "Kinh te vi mo", "Kinh te vi mo", "Marketing", "Nhan su", "Tai chinh doanh nghiep", "Khoi nghiep", "Quan tri chien luoc")),
            Map.entry("ke toan - kiem toan", List.of("Ke toan tai chinh", "Ke toan quan tri", "Kiem toan", "Thue", "Excel", "Tai chinh doanh nghiep", "Nguyen ly ke toan", "Phan tich bao cao")),
            Map.entry("tai chinh - ngan hang", List.of("Tai chinh doanh nghiep", "Dau tu", "Ngan hang thuong mai", "Quan tri rui ro", "Kinh te luong", "Excel", "Phan tich tai chinh", "Thi truong chung khoan")),
            Map.entry("ngon ngu anh", List.of("IELTS", "TOEIC", "Bien phien dich", "Ngu phap", "Viet hoc thuat", "Giao tiep", "Phat am", "Van hoa Anh - My")),
            Map.entry("thiet ke do hoa", List.of("Photoshop", "Illustrator", "Figma", "Typography", "Mau sac", "Branding", "UI/UX", "Portfolio")),
            Map.entry("y da khoa", List.of("Giai phau", "Sinh ly", "Hoa sinh", "Duoc ly", "Benh hoc", "Lam sang", "Y duc", "Tieng Anh chuyen nganh")),
            Map.entry("duoc hoc", List.of("Hoa duoc", "Duoc ly", "Bao che", "Duoc lieu", "Kiem nghiem", "Hoa phan tich", "Thuc tap nha thuoc", "Tieng Anh chuyen nganh")),
            Map.entry("co khi", List.of("Co ly thuyet", "Suc ben vat lieu", "Ve ky thuat", "CAD/CAM", "Nguyen ly may", "Vat lieu co khi", "Dieu khien tu dong", "Thuc hanh xuong")),
            Map.entry("dien - dien tu", List.of("Mach dien", "Dien tu co ban", "Vi dieu khien", "Tin hieu va he thong", "PLC", "IoT", "Dieu khien tu dong", "Thuc hanh dien"))
    );

    private static final List<String> HIGH_SCHOOLS = List.of(
            "THPT Chuyên Lê Hồng Phong", "THPT Nguyễn Thị Minh Khai", "THPT Gia Định",
            "THPT Marie Curie", "THPT Trưng Vương", "THPT Bùi Thị Xuân",
            "THPT Nguyễn Huệ", "THPT Phan Châu Trinh", "THPT Hoàng Hoa Thám",
            "THPT Trần Phú", "THPT Chuyên Lê Quý Đôn", "THPT chuyên Khoa học Tự nhiên",
            "THPT Chu Văn An", "THPT Amsterdam", "THPT Kim Liên", "THPT Việt Đức"
    );

    private static final List<String> UNIVERSITIES = List.of(
            "ĐH Bách Khoa HCM", "ĐH Khoa học Tự nhiên HCM", "ĐH Công nghệ Thông tin HCM",
            "ĐH Kinh tế HCM", "ĐH Ngoại thương", "ĐH Y Dược HCM", "ĐH Sư phạm HCM",
            "ĐH Tôn Đức Thắng", "ĐH FPT", "ĐH Văn Lang", "ĐH RMIT Việt Nam",
            "ĐH Bách Khoa Hà Nội", "ĐH Công nghệ - ĐHQG Hà Nội", "ĐH Kinh tế Quốc dân",
            "Học viện Công nghệ Bưu chính Viễn thông", "ĐH Đà Nẵng", "ĐH Cần Thơ"
    );

    private static final List<String> GOALS = List.of(
            "Cải thiện GPA học kỳ này",
            "Đạt chứng chỉ tiếng Anh (IELTS/TOEIC)",
            "Chuẩn bị thi tốt nghiệp THPT",
            "Chuẩn bị thi đại học",
            "Học thêm kỹ năng mới",
            "Tìm bạn học cùng lịch rảnh",
            "Ôn lại môn đang yếu"
    );

    private static final List<Map<String, String>> TIME_SLOTS = List.of(
            Map.of("start", "06:00", "end", "08:00", "label", "6h-8h"),
            Map.of("start", "08:00", "end", "10:00", "label", "8h-10h"),
            Map.of("start", "13:00", "end", "15:00", "label", "13h-15h"),
            Map.of("start", "15:00", "end", "17:00", "label", "15h-17h"),
            Map.of("start", "17:00", "end", "19:00", "label", "17h-19h"),
            Map.of("start", "19:00", "end", "21:00", "label", "19h-21h"),
            Map.of("start", "21:00", "end", "23:00", "label", "21h-23h")
    );

    @GetMapping("/onboarding-options")
    public ResponseEntity<?> onboardingOptions(@RequestParam(required = false) String userType,
                                               @RequestParam(required = false) String major,
                                               @RequestParam(required = false) String q) {
        boolean highschool = "HIGHSCHOOL".equalsIgnoreCase(userType);
        List<String> schools = highschool ? HIGH_SCHOOLS : UNIVERSITIES;
        List<String> subjects = highschool
                ? HIGHSCHOOL_SUBJECTS
                : MAJOR_SUBJECTS.getOrDefault(normalize(major), UNIVERSITY_SUBJECTS);
        String query = normalize(q);

        if (!query.isBlank()) {
            schools = schools.stream()
                    .filter(s -> normalize(s).contains(query))
                    .limit(12)
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "schools", schools,
                "subjects", subjects,
                "majors", highschool ? List.of() : UNIVERSITY_MAJORS,
                "interestFields", highschool ? HIGHSCHOOL_SUBJECTS : UNIVERSITY_MAJORS,
                "interestTags", subjects,
                "goals", GOALS,
                "timeSlots", TIME_SLOTS
        )));
    }

    @GetMapping("/interests")
    public ResponseEntity<?> getInterests(Authentication auth) {
        User user = findCurrentUser(auth);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "tags", user.getInterests() != null ? user.getInterests() : new ArrayList<>()
        )));
    }

    @PutMapping("/interests")
    public ResponseEntity<?> updateInterests(Authentication auth,
                                             @RequestBody Map<String, List<String>> body) {
        User user = findCurrentUser(auth);

        List<String> current = user.getInterests() != null
                ? new ArrayList<>(user.getInterests())
                : new ArrayList<>();
        List<String> incoming = body.getOrDefault("tags", new ArrayList<>());

        LinkedHashMap<String, String> merged = new LinkedHashMap<>();
        for (String tag : current) {
            putTag(merged, tag);
        }
        for (String tag : incoming) {
            putTag(merged, tag);
        }

        List<String> interests = merged.values().stream().limit(30).collect(Collectors.toList());
        user.setInterests(interests);
        userRepo.save(user);

        return ResponseEntity.ok(ApiResponse.ok(Map.of("tags", interests), "Đã cập nhật sở thích"));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> leaderboard() {
        List<User> users = userRepo.findAll(Sort.by(Sort.Direction.DESC, "xp")).stream()
                .filter(u -> !u.isLocked() && u.getRole() != User.Role.ADMIN)
                .limit(20)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    private void putTag(LinkedHashMap<String, String> tags, String tag) {
        String normalized = normalize(tag);
        if (!normalized.isBlank()) {
            tags.putIfAbsent(normalized, tag.trim());
        }
    }

    private User findCurrentUser(Authentication auth) {
        String subject = auth.getName();
        return userRepo.findById(subject)
                .or(() -> userRepo.findByEmail(subject))
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase().trim();
    }
}
