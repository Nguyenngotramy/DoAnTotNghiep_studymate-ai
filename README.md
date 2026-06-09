# DoAnTotNghiep_studymate-ai
1.\studymate-ai\backend
mvn spring-boot:run
2.studymate-ai\frontend
npm run dev
3.studymate-ai\ml_service
uvicorn main:app --port 8000 --reload
4.MongoDB
5. resource/application




Hiện Tại Admin chưa làm

| Frontend file                   | Backend đi kèm                                                 | Sửa gì trong đó                                           |
| ------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `auth/LoginPage.tsx`            | `AuthController.java`, `AuthService.java`, `JwtService.java`   | đăng nhập, token, redirect, lỗi login,                    |
| `auth/RegisterPage.tsx`         | `AuthController.java`, `AuthService.java`, `User.java`         | đăng ký, userType, strong/weak subjects, goal, bỏ teacher |
| `auth/ForgotPasswordPage.tsx`   | `AuthController.java`, `AuthService.java`, `EmailService.java` | quên mật khẩu, OTP, reset password, resend OTP            |
| `auth/OAuth2CallbackPage.tsx`   | OAuth config, `AuthService.java`                               | callback Google, setAuth, redirect                        |
| `auth/GoogleOnboardingPage.tsx` | `UserController.java`, `UserService.java`                      | onboarding user Google lần đầu                            |

| Frontend file                  | Backend đi kèm                                            | Sửa gì trong đó                                        |
| ------------------------------ | --------------------------------------------------------- | ------------------------------------------------------ |
| `social/DashboardPage.tsx`     | `DashboardController.java`, `DashboardService.java`       | stats, activity, documentCount, activity ghi rõ làm gì |
| `social/BlogPage.tsx`          | `PostController.java`, `PostService.java`                 | danh sách bài viết                                     |
| `social/CreatePostPage.tsx`    | `PostController.java`, `PostService.java`                 | tạo bài viết, upload ảnh/file                          |
| `social/PostDetailPage.tsx`    | `PostController.java`, `PostService.java`                 | chi tiết post, like, comment                           |
| `social/DiscoverPage.tsx`      | search/discover controller/service                        | khám phá user/group/post                               |
| `social/SearchPage.tsx`        | search controller/service                                 | tìm kiếm toàn app                                      |
| `social/FriendsPage.tsx`       | friend controller/service, `UserService.java`             | kết bạn, lời mời, danh sách bạn                        |
| `social/InboxPage.tsx`         | chat/message controller/service, websocket                | inbox, thread, tin nhắn                                |
| `social/NotificationsPage.tsx` | `NotificationController.java`, `NotificationService.java` | danh sách thông báo, mark read                         |
| `social/ProfilePage.tsx`       | `UserController.java`, `UserService.java`                 | hồ sơ của mình                                         |
| `social/Editprofilepage.tsx`   | `UserController.java`, `UserService.java`                 | sửa hồ sơ, avatar, cover, subjects, schedule           |
| `social/UserProfilePage.tsx`   | `UserController.java`, `UserService.java`                 | xem hồ sơ người khác                                   |
| `social/SettingsPage.tsx`      | `UserController.java`, `UserService.java`                 | cài đặt tài khoản / preferences                        |

| Frontend file                  | Backend đi kèm                                            | Sửa gì trong đó                                        |
| ------------------------------ | --------------------------------------------------------- | ------------------------------------------------------ |
| `social/DashboardPage.tsx`     | `DashboardController.java`, `DashboardService.java`       | stats, activity, documentCount, activity ghi rõ làm gì |
| `social/BlogPage.tsx`          | `PostController.java`, `PostService.java`                 | danh sách bài viết                                     |
| `social/CreatePostPage.tsx`    | `PostController.java`, `PostService.java`                 | tạo bài viết, upload ảnh/file                          |
| `social/PostDetailPage.tsx`    | `PostController.java`, `PostService.java`                 | chi tiết post, like, comment                           |
| `social/DiscoverPage.tsx`      | search/discover controller/service                        | khám phá user/group/post                               |
| `social/SearchPage.tsx`        | search controller/service                                 | tìm kiếm toàn app                                      |
| `social/FriendsPage.tsx`       | friend controller/service, `UserService.java`             | kết bạn, lời mời, danh sách bạn                        |
| `social/InboxPage.tsx`         | chat/message controller/service, websocket                | inbox, thread, tin nhắn                                |
| `social/NotificationsPage.tsx` | `NotificationController.java`, `NotificationService.java` | danh sách thông báo, mark read                         |
| `social/ProfilePage.tsx`       | `UserController.java`, `UserService.java`                 | hồ sơ của mình                                         |
| `social/Editprofilepage.tsx`   | `UserController.java`, `UserService.java`                 | sửa hồ sơ, avatar, cover, subjects, schedule           |
| `social/UserProfilePage.tsx`   | `UserController.java`, `UserService.java`                 | xem hồ sơ người khác                                   |
| `social/SettingsPage.tsx`      | `UserController.java`, `UserService.java`                 | cài đặt tài khoản / preferences                        |

| Frontend file                            | Backend đi kèm                                                          | Sửa gì trong đó                                       |
| ---------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `user/groups/GroupsPage.tsx`             | `GroupController.java`, `GroupService.java`, `GroupRepository.java`     | list nhóm, tạo nhóm, join nhóm                        |
| `user/groups/GroupDetailPage.tsx`        | `GroupController.java`, `GroupService.java`                             | chi tiết nhóm, member, info                           |
| `user/groups/KanbanPage.tsx`             | `TaskController.java`, `TaskService.java`, `TaskRepository.java`        | board task nhóm, create task, đổi status              |
| `user/groups/TaskDetailPage.tsx`         | `TaskController.java`, `TaskService.java`                               | chi tiết task nhóm, comment, reply, submit bài        |
| `user/groups/MyTasksPage.tsx`            | `TaskController.java`, `TaskService.java`                               | nhiệm vụ của tôi, task cá nhân + task nhóm            |
| `user/groups/PersonalTaskDetailPage.tsx` | `TaskController.java`, `TaskService.java`                               | chi tiết task cá nhân, upload file/ảnh, submit        |
| `user/groups/TaskProgressPage.tsx`       | `TaskController.java`, `TaskService.java`                               | thống kê task, roadmap deadline                       |
| `user/groups/DocsPage.tsx`               | `DocumentController.java`, `DocumentService.java`, `StudyDocument.java` | tài liệu nhóm, upload file, AI summary/flashcard/quiz |
| `user/groups/ChatPage.tsx`               | chat controller/service, websocket                                      | chat nhóm, realtime                                   |
| `user/groups/MyStudyDrivePage.tsx`       | document/file service                                                   | kho học liệu cá nhân                                  |

| Frontend file             | Backend đi kèm                                                                                                        | Sửa gì trong đó                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `FlashcardPage.tsx`       | `FlashcardController.java`, `FlashcardService.java`, `FlashcardDeckRepository.java`, `FlashcardFolderRepository.java` | deck, folder, AI từ tài liệu, sửa/xóa  |
| `QuizPage.tsx`            | `QuizController.java`, `QuizService.java`                                                                             | bộ quiz, folder quiz, AI quiz          |
| `StatisticsPage.tsx`      | `StudyController.java`, `StudyService.java`, `TaskService.java`                                                       | thống kê task/học tập, chart           |
| `predict/PredictPage.tsx` | `StudyController.java`, `StudyService.java`, `PredictService.java`                                                    | hồ sơ học tập, lưu kỳ, dự đoán học lực |

| Frontend file         | Backend đi kèm                    | Sửa gì trong đó                                       |
| --------------------- | --------------------------------- | ----------------------------------------------------- |
| `store/authStore.ts`  | auth/profile APIs                 | user, token, setAuth, updateUser                      |
| `store/notifStore.ts` | notification APIs                 | state thông báo                                       |
| `store/uiStore.ts`    | không phụ thuộc backend trực tiếp | dark/light, sidebar, UI state                         |
| `types/index.ts`      | tất cả model/backend response     | type User, Task, Group, Flashcard, Quiz, StudyTerm... |
| `utils/gradeUtils.ts` | study/predict logic               | GPA, quy đổi điểm, xếp loại                           |
| `utils/helpers.ts`    | không phụ thuộc backend trực tiếp | helper format date/text                               |
# Docker va production deployment

He thong gom Caddy HTTPS gateway, React/Nginx, Spring Boot, MongoDB, ML service,
AI agent va hai dich vu backup. Chi Caddy mo cong `80` va `443`; database va API
noi bo khong bi public ra Internet.

## Chay local

Yeu cau Docker Desktop hoac Docker Engine kem Compose plugin.

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item ai_agent/.env.example ai_agent/.env
```

Thay tat ca gia tri mau trong ba file `.env`, sau do:

```powershell
docker compose up -d --build
```

Ung dung local: `http://localhost`.

## Deploy VPS Ubuntu

1. Chuan bi VPS toi thieu 4 vCPU, 8 GB RAM, 40 GB SSD.
2. Tro ban ghi DNS `A` cua domain ve IP VPS.
3. Mo firewall TCP `22`, `80`, `443` va UDP `443`.
4. Cai Docker Engine va Docker Compose plugin.
5. Clone repository, tao ba file `.env` tu cac file `.env.example`.

Vi du `.env` production:

```dotenv
SITE_ADDRESS=studymate.example.com
FRONTEND_URL=https://studymate.example.com
APP_PUBLIC_BASE_URL=https://studymate.example.com/api
MONGO_ROOT_USERNAME=studymate_admin
MONGO_ROOT_PASSWORD=use_a_long_url_safe_password
AI_AGENT_WORKERS=1
APP_LOG_LEVEL=INFO
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=7
```

Mat khau Mongo chi nen dung chu, so va cac ky tu `_ . ~ -` de URI khong bi loi.

Chay deployment:

```bash
chmod +x deploy/*.sh
./deploy/deploy.sh
```

Caddy tu dong xin va gia han chung chi HTTPS. DNS phai tro dung VPS va cong
`80/443` phai truy cap duoc tu Internet.

## Cau hinh dich vu ngoai

- Google OAuth redirect URI:
  `https://studymate.example.com/api/login/oauth2/code/google`
- Cloudinary: cap nhat cloud name, API key va secret trong `backend/.env`.
- Gmail: dung App Password, khong dung mat khau Gmail thong thuong.
- OpenRouter/OpenAI: cap nhat key trong ca `backend/.env` va `ai_agent/.env`.
- MoMo/VNPay: de trong neu chua su dung; neu bat thanh toan, dien credential that
  va callback theo domain production.

## Van hanh

```bash
docker compose ps
docker compose logs -f
docker compose pull
docker compose up -d --build
docker compose down
```

Backup duoc ghi vao `./backups`: MongoDB archive va file uploads/AI volumes.
Khong chay `docker compose down -v` tren production vi lenh do xoa volume du lieu.

Khoi phuc Mongo:

```bash
./deploy/restore-mongo.sh backups/studymate-YYYYMMDDTHHMMSSZ.archive.gz
```
