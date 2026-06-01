# Recommendation notes

## Mục tiêu

StudyMate AI cá nhân hóa trải nghiệm ngay từ lúc đăng ký:

- Bài viết liên quan môn học quan tâm lên trước.
- Trang Khám phá ưu tiên bài viết, nhóm và bạn học phù hợp.
- Bạn học được gợi ý theo điểm chung và khả năng hỗ trợ môn yếu.
- Lịch trống được lưu để gợi ý lịch học thêm hoặc ghép bạn học cùng giờ rảnh.

## Thuật toán đang dùng

Hệ thống dùng hybrid scoring, giống cách các web cộng đồng/học tập thường làm ở giai đoạn đầu:

1. Content-based scoring
   - So khớp tag bài viết, môn của nhóm, kỹ năng của người dùng với `interests`, `strongSubjects`, `weakSubjects`.
   - Môn cần cải thiện được cho trọng số cao hơn vì đó là nhu cầu học tập trực tiếp.

2. Behavior scoring
   - Khi người dùng xem, thích, lưu hoặc bình luận bài viết, tag của bài được cộng vào `tagViewCount`.
   - Điểm hành vi này được cộng vào điểm sở thích ban đầu để feed càng dùng càng cá nhân hóa.

3. Social matching
   - Gợi ý bạn học dựa trên môn chung, trường, loại người dùng và lịch rảnh chung.
   - Nếu người dùng yếu môn A và người khác mạnh môn A, match được cộng điểm mạnh hơn.

4. Schedule constraint
   - `availableSchedule` lưu các khung giờ rảnh.
   - Trang dự đoán học tập ưu tiên xếp môn yếu vào đúng các khung giờ người dùng đã chọn.

## Trọng số hiện tại

- Bài viết trùng `weakSubjects`: +10
- Bài viết trùng `interests`: +8
- Bài viết trùng `strongSubjects`: +6
- Lịch sử xem tag: +1 mỗi lượt xem
- Like bài viết: +3 vào tag
- Bình luận: +2 vào tag
- Lưu bài: +5 vào tag
- Bài mới trong 48h: +3
- Like/comment/save/view của bài vẫn được dùng để giữ yếu tố thịnh hành.

## Luồng dữ liệu

1. Đăng ký hoặc Google onboarding lấy gợi ý từ `/users/onboarding-options`.
2. Người dùng chọn loại tài khoản, trường, môn mạnh, môn yếu, tag quan tâm và lịch trống.
3. Backend lưu vào `User`:
   - `school`
   - `strongSubjects`
   - `weakSubjects`
   - `interests`
   - `availableSchedule`
4. Feed và Khám phá gọi API hiện có:
   - `/posts/feed`
   - `/posts/trending`
   - `/groups/public`
   - `/friends/suggestions`
5. Các API này trả dữ liệu đã được sắp xếp theo hồ sơ người dùng hiện tại.

## Hướng phát triển tiếp

- Tách trọng số sang config để admin chỉnh không cần sửa code.
- Lưu impression/click trên từng card ở Khám phá để học chính xác hơn.
- Thêm major/khối thi để gợi ý trường/ngành sâu hơn.
- Dùng vector embedding cho bài viết dài khi dữ liệu đủ lớn.
