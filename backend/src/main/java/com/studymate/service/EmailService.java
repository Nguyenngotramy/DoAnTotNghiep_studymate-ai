package com.studymate.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

@Service @RequiredArgsConstructor @Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:StudyMate AI}")
    private String appName;

    /**
     * Gửi email OTP đặt lại mật khẩu.
     * @Async để không block request thread.
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String userName, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, appName);
            helper.setTo(toEmail);
            helper.setSubject("[" + appName + "] Mã xác minh đặt lại mật khẩu");

            String html = buildOtpEmailHtml(userName, otp);
            helper.setText(html, true); // true = HTML

            mailSender.send(message);
            log.info("Password reset OTP sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            // Không throw — để OTP vẫn được lưu, user có thể thử lại
        }
    }

    /**
     * Gửi email xác nhận đã đổi mật khẩu thành công.
     */
    @Async
    public void sendPasswordChangedConfirmation(String toEmail, String userName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, appName);
            helper.setTo(toEmail);
            helper.setSubject("[" + appName + "] Mật khẩu đã được đổi thành công");

            String html = buildPasswordChangedHtml(userName);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send password changed email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── HTML templates ─────────────────────────────────────

    private String buildOtpEmailHtml(String name, String otp) {
        return """
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"/></head>
            <body style="margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:480px;margin:40px auto;background:#16161d;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">StudyMate AI</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:13px;">Học nhóm thông minh</p>
                </div>
                <!-- Body -->
                <div style="padding:32px;">
                  <p style="margin:0 0 8px;color:#f0f0f5;font-size:16px;font-weight:600;">
                    Xin chào, %s! 👋
                  </p>
                  <p style="margin:0 0 24px;color:#8b8b9e;font-size:14px;line-height:1.6;">
                    Chúng mình nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                    Sử dụng mã OTP dưới đây để tiếp tục:
                  </p>
                  <!-- OTP Box -->
                  <div style="background:#1e1e2e;border:2px solid #6366f1;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                    <p style="margin:0 0 6px;color:#8b8b9e;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Mã xác minh</p>
                    <div style="font-size:36px;font-weight:900;letter-spacing:10px;color:#6366f1;font-family:monospace;">
                      %s
                    </div>
                  </div>
                  <p style="margin:0 0 8px;color:#8b8b9e;font-size:13px;">
                    ⏱️ Mã có hiệu lực trong <strong style="color:#f59e0b;">15 phút</strong>
                  </p>
                  <p style="margin:0 0 24px;color:#8b8b9e;font-size:13px;">
                    🔒 Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                  </p>
                  <hr style="border:none;border-top:1px solid rgba(255,255,255,.07);margin:0 0 20px;"/>
                  <p style="margin:0;color:#5a5a6e;font-size:12px;text-align:center;">
                    © 2026 StudyMate AI · Học nhóm thông minh
                  </p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, otp);
    }

    private String buildPasswordChangedHtml(String name) {
        return """
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"/></head>
            <body style="margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:480px;margin:40px auto;background:#16161d;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
                <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:28px 32px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">✅ Đổi mật khẩu thành công</h1>
                </div>
                <div style="padding:32px;">
                  <p style="margin:0 0 12px;color:#f0f0f5;font-size:15px;">Xin chào, %s!</p>
                  <p style="margin:0 0 20px;color:#8b8b9e;font-size:14px;line-height:1.6;">
                    Mật khẩu tài khoản StudyMate AI của bạn đã được thay đổi thành công.
                  </p>
                  <p style="margin:0 0 20px;color:#8b8b9e;font-size:14px;">
                    ⚠️ Nếu bạn không thực hiện thao tác này, vui lòng liên hệ ngay với chúng mình
                    hoặc đặt lại mật khẩu ngay lập tức.
                  </p>
                  <hr style="border:none;border-top:1px solid rgba(255,255,255,.07);margin:0 0 20px;"/>
                  <p style="margin:0;color:#5a5a6e;font-size:12px;text-align:center;">
                    © 2026 StudyMate AI
                  </p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name);
    }
}
