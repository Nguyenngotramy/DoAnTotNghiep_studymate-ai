"""Build compact admission enrichment files from scraped CSV sources."""

from __future__ import annotations

import argparse
import csv
import re
import unicodedata
from collections import defaultdict
from pathlib import Path


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D").lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def normalize_school(value: str) -> str:
    text = normalize(value)
    if re.match(r"^[A-Z0-9]{2,5}-", (value or "").strip()):
        return re.sub(r"^[a-z0-9]{2,5}\s+", "", text)
    return text


def normalize_major(value: str) -> str:
    text = re.sub(r"\s*\([^)]*\)\s*", " ", normalize(value))
    return " ".join(text.split())


def split_values(value: str) -> set[str]:
    return {
        item.strip()
        for item in re.split(r"[;,]", value or "")
        if item.strip()
    }


METHOD_LABELS = [
    ("ĐT THPT", ("đt thpt", "điểm thi thpt")),
    ("Học bạ", ("học bạ",)),
    ("ĐGNL HCM", ("đgnl hcm",)),
    ("ĐGNL HN", ("đgnl hn",)),
    ("ĐGNL SPHN", ("đgnl sphn",)),
    ("ĐGTD BK", ("đgtd bk",)),
    ("V-SAT", ("v-sat", "vsat")),
    ("Kết hợp", ("kết hợp",)),
    ("Chứng chỉ quốc tế", ("ccqt", "chứng chỉ quốc tế")),
    ("Ưu tiên xét tuyển", ("ưu tiên",)),
]


def canonical_methods(value: str) -> set[str]:
    normalized = normalize(value)
    methods = {
        label
        for label, aliases in METHOD_LABELS
        if any(normalize(alias) in normalized for alias in aliases)
    }
    return methods or ({value.strip()} if value.strip() else set())


def clean_tuition(value: str) -> str:
    segments = [re.sub(r"\s+", " ", item).strip(" |-") for item in value.split("|")]
    informative = [
        item
        for item in segments
        if item
        and "file pdf" not in normalize(item)
        and "tai file" not in normalize(item)
    ]
    if len(informative) > 1:
        informative = informative[1:]

    unique = []
    seen = set()
    for item in informative:
        key = normalize(item)
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return " ".join(unique)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def program_sort_key(row: dict[str, str]) -> tuple[str, str, str]:
    return (
        normalize_school(row["ten_truong"]),
        normalize_major(row["ten_nganh"]),
        row["ma_nganh"],
    )


def build_programs(source: Path, destination: Path) -> int:
    grouped: dict[tuple[str, str, str], dict] = {}

    for row in read_csv(source):
        school_name = (row.get("ten_truong") or "").strip()
        major_name = (row.get("ten_nganh") or "").strip()
        major_code = (row.get("ma_nganh") or "").strip()
        if not school_name or not major_name:
            continue

        key = (
            normalize_school(school_name),
            major_code,
            normalize_major(major_name),
        )
        item = grouped.setdefault(
            key,
            {
                "ma_truong": (row.get("ma_truong") or "").strip(),
                "ten_truong": school_name,
                "ma_nganh": major_code,
                "ten_nganh": major_name,
                "chi_tieu": set(),
                "phuong_thuc_xet_tuyen": set(),
                "to_hop_mon": set(),
            },
        )
        if not item["ma_truong"] and row.get("ma_truong"):
            item["ma_truong"] = row["ma_truong"].strip()
        item["chi_tieu"].update(split_values(row.get("chi_tieu") or ""))
        method = (row.get("phuong_thuc_xet_tuyen") or "").strip()
        item["phuong_thuc_xet_tuyen"].update(canonical_methods(method))
        item["to_hop_mon"].update(split_values(row.get("to_hop_mon") or ""))

    rows = []
    for item in grouped.values():
        quotas = sorted(
            item["chi_tieu"],
            key=lambda value: (not value.isdigit(), int(value) if value.isdigit() else value),
        )
        rows.append(
            {
                "ma_truong": item["ma_truong"],
                "ten_truong": item["ten_truong"],
                "ma_nganh": item["ma_nganh"],
                "ten_nganh": item["ten_nganh"],
                "chi_tieu": "; ".join(quotas),
                "phuong_thuc_xet_tuyen": "; ".join(
                    sorted(item["phuong_thuc_xet_tuyen"])
                ),
                "to_hop_mon": "; ".join(sorted(item["to_hop_mon"])),
            }
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "ma_truong",
                "ten_truong",
                "ma_nganh",
                "ten_nganh",
                "chi_tieu",
                "phuong_thuc_xet_tuyen",
                "to_hop_mon",
            ],
        )
        writer.writeheader()
        writer.writerows(sorted(rows, key=program_sort_key))
    return len(rows)


def build_tuition(source: Path, destination: Path) -> int:
    grouped: dict[str, dict[str, str]] = {}
    for row in read_csv(source):
        school_name = (row.get("ten_truong") or "").strip()
        tuition = clean_tuition(row.get("hoc_phi_raw") or "")
        if not school_name or not tuition:
            continue

        key = normalize_school(school_name)
        current = grouped.get(key)
        if current is None or len(tuition) > len(current["hoc_phi_raw"]):
            grouped[key] = {
                "ma_truong": (row.get("ma_truong") or "").strip(),
                "ten_truong": school_name,
                "hoc_phi_raw": tuition,
            }

    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["ma_truong", "ten_truong", "hoc_phi_raw"],
        )
        writer.writeheader()
        writer.writerows(
            sorted(grouped.values(), key=lambda row: normalize_school(row["ten_truong"]))
        )
    return len(grouped)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--programs", type=Path, required=True)
    parser.add_argument("--tuition", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    program_count = build_programs(
        args.programs,
        args.output_dir / "nganh_dao_tao_hien_tai.csv",
    )
    tuition_count = build_tuition(
        args.tuition,
        args.output_dir / "hoc_phi_tham_khao.csv",
    )
    print(f"programs={program_count} tuition_schools={tuition_count}")


if __name__ == "__main__":
    main()
