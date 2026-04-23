"""
StudyMate AI — Python ML Service
Chạy: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
Cài:  pip install fastapi uvicorn scikit-learn numpy pandas
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import numpy as np

app = FastAPI(title="StudyMate ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request / Response schemas ───────────────────────────

class PredictRequest(BaseModel):
    mode: str = "sv"                    # "sv" | "cap3"
    scores: Dict[str, float]            # {"toan": 8.0, "ly": 7.5, ...}
    khoi: Optional[str] = None          # "A00", "B00", ...
    uuTienKV: Optional[float] = 0.0
    uuTienDT: Optional[float] = 0.0
    targetGrade: Optional[str] = "GIOI"
    hoursPerWeek: Optional[int] = 21
    weeksLeft: Optional[int] = 12
    attendance: Optional[int] = 90
    redoCount: Optional[int] = 0

class PlanItem(BaseModel):
    subject: str
    currentScore: float
    gap: float
    hoursPerWeek: float
    status: str                         # "urgent" | "warn" | "ok"

class PredictResponse(BaseModel):
    predictedGrade: str
    gpa: float
    probability: float
    advice: str
    studyPlan: List[PlanItem]
    thptScore: Optional[float] = None   # chỉ dùng cho mode cap3

# ─── Constants ────────────────────────────────────────────

GRADE_THRESHOLDS = {
    "XUAT_SAC": 9.0,
    "GIOI":     8.0,
    "KHA":      7.0,
    "TRUNG_BINH": 5.0,
    "YEU":      0.0,
}

GRADE_LABELS = {
    "XUAT_SAC": "Xuất sắc",
    "GIOI":     "Giỏi",
    "KHA":      "Khá",
    "TRUNG_BINH": "Trung bình",
    "YEU":      "Yếu",
}

# Trọng số tín chỉ mặc định cho sinh viên ĐH
SV_CREDITS: Dict[str, float] = {
    "toan": 4, "ly": 3, "hoa": 3, "anh": 3,
    "ltc": 3, "csdl": 3, "mmt": 3, "ktmt": 3,
    "giaitich": 4, "daisothuyentuyen": 3, "xacsuatthongke": 3,
    "vatly1": 3, "vatly2": 3, "trietchh": 3, "kinhte": 2,
}

# Trọng số THPT theo môn
THPT_WEIGHTS: Dict[str, float] = {
    "toan": 2, "van": 1, "anh": 1,
    "ly": 1, "hoa": 1, "sinh": 1,
    "su": 1, "dia": 1, "gdcd": 1,
}

# ─── Core algorithms ──────────────────────────────────────

def calc_gpa_sv(scores: Dict[str, float]) -> float:
    """Tính GPA thang 10 theo tín chỉ"""
    total_score = 0.0
    total_credit = 0.0
    for subj, score in scores.items():
        credit = SV_CREDITS.get(subj, 3)
        total_score += score * credit
        total_credit += credit
    return round(total_score / total_credit, 2) if total_credit > 0 else 0.0


def calc_thpt_score(scores: Dict[str, float],
                    khoi: Optional[str],
                    uu_tien_kv: float,
                    uu_tien_dt: float) -> float:
    """Tính điểm xét tuyển THPT theo khối"""
    KHOI_MAP = {
        "A00": ["toan", "ly", "hoa"],
        "A01": ["toan", "ly", "anh"],
        "B00": ["toan", "hoa", "sinh"],
        "C00": ["van", "su", "dia"],
        "D01": ["toan", "van", "anh"],
        "D07": ["toan", "hoa", "anh"],
        "A02": ["toan", "ly", "sinh"],
        "B08": ["toan", "sinh", "anh"],
    }
    subjects = KHOI_MAP.get(khoi or "A00", list(scores.keys())[:3])
    raw = sum(scores.get(s, 0) for s in subjects)
    return round(raw + (uu_tien_kv or 0) + (uu_tien_dt or 0), 2)


def classify_grade(gpa: float) -> str:
    for grade, threshold in GRADE_THRESHOLDS.items():
        if gpa >= threshold:
            return grade
    return "YEU"


def calc_probability(gpa: float, target: str,
                     hours_per_week: int,
                     weeks_left: int,
                     attendance: int,
                     redo_count: int) -> float:
    """
    Tính xác suất đạt mục tiêu dựa trên nhiều yếu tố.
    Dùng sigmoid-like function.
    """
    target_val = GRADE_THRESHOLDS.get(target, 8.0)
    gap = target_val - gpa

    # Base probability từ gap
    if gap <= 0:
        base = 85 + min(10, abs(gap) * 5)
    else:
        base = max(5, 85 - gap * 18)

    # Điều chỉnh theo thời gian học
    time_bonus = (hours_per_week / 21.0) * 5 + (weeks_left / 12.0) * 5

    # Penalty cho chuyên cần thấp
    att_penalty = max(0, (80 - attendance) * 0.3) if attendance < 80 else 0

    # Penalty cho thi lại
    redo_penalty = min(10, redo_count * 3)

    prob = base + time_bonus - att_penalty - redo_penalty
    return round(min(95, max(5, prob)), 1)


def build_study_plan(scores: Dict[str, float],
                     target: str,
                     hours_per_week: int,
                     weeks_left: int,
                     mode: str) -> List[PlanItem]:
    """
    Weighted Gap Optimization:
    Phân bổ giờ học tỉ lệ với (gap × trọng_số môn),
    đảm bảo mỗi môn ít nhất 1h/tuần.
    """
    target_val = GRADE_THRESHOLDS.get(target, 8.0)
    credits = SV_CREDITS if mode == "sv" else THPT_WEIGHTS
    total_hours = hours_per_week * weeks_left

    items = []
    for subj, score in scores.items():
        gap = max(0, target_val - score)
        weight = credits.get(subj, 3 if mode == "sv" else 1)
        status = "urgent" if score < 5 else ("warn" if score < target_val else "ok")
        items.append({
            "subject": subj,
            "score": score,
            "gap": round(gap, 2),
            "weight": weight,
            "status": status,
        })

    total_gap_weight = sum(i["gap"] * i["weight"] for i in items)
    min_hours = 1.0

    plan = []
    for item in sorted(items, key=lambda x: x["gap"] * x["weight"], reverse=True):
        if total_gap_weight > 0:
            proportion = (item["gap"] * item["weight"]) / total_gap_weight
        else:
            proportion = 1.0 / len(items)

        extra = max(0, total_hours - len(items) * min_hours) * proportion
        h_per_week = round((min_hours + extra / weeks_left) if weeks_left > 0 else min_hours, 1)

        plan.append(PlanItem(
            subject=item["subject"],
            currentScore=round(item["score"], 2),
            gap=item["gap"],
            hoursPerWeek=h_per_week,
            status=item["status"],
        ))

    return plan


def generate_advice(gpa: float, gap: float, scores: Dict[str, float],
                    target: str, mode: str,
                    hours_per_week: int, weeks_left: int,
                    attendance: int, redo_count: int) -> str:
    tips = []

    # Môn yếu nhất
    if scores:
        weakest_subj = min(scores, key=scores.get)
        weakest_score = scores[weakest_subj]
        if weakest_score < 5:
            tips.append(f"⚠️ Môn {weakest_subj} đang dưới 5 điểm ({weakest_score:.1f}) — cần ưu tiên gấp, có thể ảnh hưởng xét tốt nghiệp.")
        elif weakest_score < 7:
            tips.append(f"📈 Môn {weakest_subj} còn yếu ({weakest_score:.1f}đ) — nên phân bổ thêm giờ học.")

    # Chuyên cần
    if attendance < 80:
        tips.append(f"🚨 Chuyên cần {attendance}% đang kéo điểm xuống đáng kể — hãy đi học đầy đủ hơn.")
    elif attendance >= 95:
        tips.append("✅ Chuyên cần tốt ({attendance}%) — đây là lợi thế lớn của bạn!")

    # Số giờ học
    if hours_per_week < 14:
        tips.append("⏰ Số giờ học/tuần còn ít — hãy tăng lên ít nhất 21h/tuần.")

    # Thi lại
    if redo_count > 0:
        tips.append(f"📝 Bạn có {redo_count} môn thi lại — cần ưu tiên giải quyết sớm để không bị học lại.")

    # Đánh giá gap
    target_label = GRADE_LABELS.get(target, target)
    if gap <= 0:
        tips.append(f"✨ Bạn đang đạt mục tiêu {target_label}! Hãy duy trì và phấn đấu nâng cao hơn.")
    elif gap < 1:
        tips.append(f"🎯 Chỉ cần tăng thêm {gap:.1f} điểm là đạt {target_label} — bạn gần đến đích rồi!")
    elif gap < 2:
        tips.append(f"💪 Cần tăng GPA thêm {gap:.1f} điểm — hoàn toàn khả thi với {weeks_left} tuần nỗ lực.")
    else:
        tips.append(f"🔥 Cần tăng {gap:.1f} điểm để đạt {target_label} — hãy lập kế hoạch học nghiêm túc và bám sát lịch.")

    # Tổng kết
    total = hours_per_week * weeks_left
    tips.append(f"📅 Lộ trình: {hours_per_week}h/tuần × {weeks_left} tuần = {total}h tổng. Tập trung vào môn yếu nhất theo kế hoạch!")

    return " | ".join(tips)


# ─── Endpoints ────────────────────────────────────────────

@app.get("/")
def root():
    return {"service": "StudyMate ML Service", "status": "running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.scores:
        raise HTTPException(status_code=400, detail="Scores không được trống")

    mode = req.mode or "sv"

    # Tính GPA
    if mode == "sv":
        gpa = calc_gpa_sv(req.scores)
    else:
        # THPT: dùng trung bình có trọng số
        total = sum(req.scores.get(s, 0) * THPT_WEIGHTS.get(s, 1) for s in req.scores)
        total_w = sum(THPT_WEIGHTS.get(s, 1) for s in req.scores)
        gpa = round(total / total_w, 2) if total_w > 0 else 0.0

    predicted_grade = classify_grade(gpa)
    target = req.targetGrade or "GIOI"
    gap = max(0, GRADE_THRESHOLDS.get(target, 8.0) - gpa)

    probability = calc_probability(
        gpa, target,
        req.hoursPerWeek or 21,
        req.weeksLeft or 12,
        req.attendance or 90,
        req.redoCount or 0,
    )

    study_plan = build_study_plan(
        req.scores, target,
        req.hoursPerWeek or 21,
        req.weeksLeft or 12,
        mode,
    )

    advice = generate_advice(
        gpa, gap, req.scores, target, mode,
        req.hoursPerWeek or 21,
        req.weeksLeft or 12,
        req.attendance or 90,
        req.redoCount or 0,
    )

    thpt_score = None
    if mode == "cap3":
        thpt_score = calc_thpt_score(
            req.scores,
            req.khoi,
            req.uuTienKV or 0,
            req.uuTienDT or 0,
        )

    return PredictResponse(
        predictedGrade=predicted_grade,
        gpa=gpa,
        probability=probability,
        advice=advice,
        studyPlan=study_plan,
        thptScore=thpt_score,
    )


@app.post("/predict/batch")
def predict_batch(requests: List[PredictRequest]):
    """Dự đoán hàng loạt — dùng cho admin analytics"""
    return [predict(r) for r in requests]


@app.get("/predict/grades")
def list_grades():
    """Danh sách xếp loại và ngưỡng điểm"""
    return [
        {"key": k, "label": GRADE_LABELS[k], "threshold": v}
        for k, v in GRADE_THRESHOLDS.items()
    ]