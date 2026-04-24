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
