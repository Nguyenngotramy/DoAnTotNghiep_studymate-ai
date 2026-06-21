import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { quizApi, flashcardApi } from "@/api/services";
import {
  clearAiConfig,
  getAiConfig,
  getAiRequestHeaders,
  loadAiProviders,
  saveAiConfig,
  validateAiConfig,
  withAiConfig,
} from "@/utils/aiConfig";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";

const API_URL = "/ai-agent";
const SESSION_KEY = "studymind_chat_session";

const AGENT_MAP = {
  TutorAgent: "Tutor",
  QuizAgent: "Quiz",
  GroupAgent: "Group",
  SummaryAgent: "Summary",
  FlashcardAgent: "Flashcard",
  VocabularyAgent: "Vocabulary",
  KepnerTregoeAgent: "KT",
};

const ACTIVE_AGENTS = [
  "TutorAgent",
  "QuizAgent",
  "GroupAgent",
  "SummaryAgent",
  "FlashcardAgent",
  "KepnerTregoeAgent",
];

const QUICK_PROMPTS = [
  { icon: "📐", label: "Giải thích tích phân", text: "Giải thích tích phân cho tôi" },
  { icon: "🔍", label: "Phân tích KT", text: "Phân tích nguyên nhân bài toán khó theo Kepner-Tregoe (IS/IS NOT)" },
  { icon: "📝", label: "Quiz đạo hàm", text: "Tạo 3 câu quiz về đạo hàm mức apply" },
  { icon: "📋", label: "Tóm tắt giới hạn", text: "Tóm tắt chương giới hạn theo dạng outline" },
  { icon: "🃏", label: "Flashcard đạo hàm", text: "Tạo 5 flashcard về đạo hàm dạng công thức" },
];

function timeNow() {
  return new Date().toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" });
}

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}

// StudyMind icon — spark + book (gọn, dễ nhận diện)
function AIIcon({ size = 22, color = "#0f0f0f" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill={color} stroke="none" opacity="0.9"/>
      <path d="M5 19c0-2.2 3.1-4 7-4s7 1.8 7 4"/>
      <path d="M12 15v4"/>
    </svg>
  );
}

function ThinkingBubble() {
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "80%" }}>
      <div style={{ fontSize: 12, fontFamily: "'Nunito', 'Inter', sans-serif", color: "var(--sm-faint)", marginBottom: 5 }}>
        StudyMind · {timeNow()}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", background: "var(--sm-surface)",
        border: "1px solid var(--sm-border)", borderRadius: "2px 10px 10px 10px",
        color: "var(--sm-muted)", fontSize: 12, fontFamily: "'Nunito', 'Inter', sans-serif"
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#7c3aed", opacity: 0.6,
              animation: "smBounce 1.2s infinite",
              animationDelay: `${delay}s`,
              display: "inline-block",
            }} />
          ))}
        </div>
        đang suy nghĩ...
      </div>
    </div>
  );
}

async function readAiResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : { detail: await res.text() };

  if (res.ok) return data;

  const detail = data?.detail || data?.message;
  const detailMessage = typeof detail === "object" ? detail?.message : detail;
  const error = new Error(detailMessage || `AI service trả về lỗi HTTP ${res.status}.`);
  error.code = (typeof detail === "object" ? detail?.code : null) || data?.code || `HTTP_${res.status}`;
  error.retryable = typeof detail === "object" ? detail?.retryable : undefined;

  if (res.status === 429) {
    error.message = detailMessage || "Hạn mức AI đã hết hoặc provider đang giới hạn tốc độ. Vui lòng thử lại sau.";
  } else if (res.status === 402) {
    error.message = detailMessage || "Tài khoản AI đã hết credit hoặc không đủ tiền dùng model.";
  } else if (res.status === 413) {
    error.message = detailMessage || "Nội dung vượt giới hạn token. Hãy chia nhỏ yêu cầu.";
  } else if (res.status === 502 || res.status === 503 || res.status === 504) {
    error.message = detailMessage || "AI service chưa sẵn sàng hoặc provider phản hồi quá chậm.";
  } else if (res.status === 401 || res.status === 403) {
    error.message = detailMessage || "AI service chưa được cấu hình đúng khóa truy cập.";
  }
  throw error;
}

function StructuredPreview({ structured }) {
  if (!structured?.items?.length) return null;

  if (structured.type === "flashcard") {
    return (
      <div style={{ display: "grid", gap: 7 }}>
        {structured.items.map((item, index) => (
          <div key={`${item.front || item.question}-${index}`} style={{
            padding: "9px 10px",
            borderRadius: 8,
            background: "var(--sm-surface)",
            border: "1px solid var(--sm-border)",
          }}>
            <div style={{ color: "#a78bfa", fontWeight: 600, marginBottom: 3 }}>
              {index + 1}. {item.front || item.question}
            </div>
            <div style={{ color: "var(--sm-text)", whiteSpace: "pre-line" }}>
              {item.back || item.answer}
            </div>
            {item.hint && (
              <div style={{ color: "var(--sm-muted)", fontSize: 11, marginTop: 3 }}>
                Gợi ý: {item.hint}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (structured.type === "quiz") {
    return (
      <div style={{ display: "grid", gap: 7 }}>
        {structured.items.map((item, index) => (
          <div key={`${item.question}-${index}`} style={{
            padding: "9px 10px",
            borderRadius: 8,
            background: "var(--sm-surface)",
            border: "1px solid var(--sm-border)",
          }}>
            <div style={{ color: "#a78bfa", fontWeight: 600 }}>
              {index + 1}. {item.question}
            </div>
            <div style={{ color: "var(--sm-muted)", fontSize: 11, marginTop: 3 }}>
              {(item.options || []).join(" · ")}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function Message({ msg, onSaveStructured }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      alignSelf: isUser ? "flex-end" : "flex-start",
      maxWidth: "88%",
      animation: "smFadeUp 0.2s ease",
    }}>
      <div style={{
        fontSize: 12, fontFamily: "'Nunito', 'Inter', sans-serif",
        color: "var(--sm-faint)", marginBottom: 5,
        textAlign: isUser ? "right" : "left"
      }}>
        {isUser ? "Bạn" : "StudyMind"} · {msg.time}
      </div>
      {msg.badge && (
        <div style={{
          display: "inline-block", fontSize: 11, padding: "2px 7px",
          borderRadius: 4, marginBottom: 6,
          background: "rgba(124,58,237,0.15)", color: "#a78bfa",
          border: "1px solid rgba(124,58,237,0.3)",
          fontFamily: "'Nunito', 'Inter', sans-serif",
        }}>
          {msg.badge}
        </div>
      )}
      <div style={{
        padding: "10px 14px", fontSize: 13, lineHeight: 1.7,
        borderRadius: isUser ? "10px 10px 2px 10px" : "2px 10px 10px 10px",
        background: isUser ? "rgba(124,58,237,.12)" : "var(--sm-surface)",
        border: isUser ? "1px solid #2d1f4e" : "1px solid #2a2a2a",
        color: "var(--sm-text)",
        wordBreak: "break-word",
      }}>
        {msg.structured ? (
          <>
            <div style={{ marginBottom: 8 }}>
              Đã tạo {msg.structured.items?.length || 0} {msg.structured.type === "quiz" ? "câu quiz" : "flashcard"}.
            </div>
            <StructuredPreview structured={msg.structured} />
          </>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
        )}
      </div>
      {msg.structured && !msg.autoSaved && onSaveStructured && (
        <button
          onClick={() => onSaveStructured(msg)}
          style={{
            marginTop: 6, fontSize: 12, padding: "4px 10px", borderRadius: 6,
            background: "rgba(124,58,237,0.15)", color: "#a78bfa",
            border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer",
          }}
        >
          💾 Lưu {msg.structured.type === "quiz" ? "quiz" : "flashcard"}
        </button>
      )}
      {msg.savedResource?.type === "quiz" && (
        <button
          onClick={() => { window.location.href = "/quiz"; }}
          style={{
            marginTop: 6, marginLeft: 6, fontSize: 12, padding: "4px 10px", borderRadius: 6,
            background: "rgba(34,197,94,0.12)", color: "#4ade80",
            border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer",
          }}
        >
          ✓ Da luu · Mo Quiz
        </button>
      )}
    </div>
  );
}

async function persistStructured(structured, sourceText = "", showSuccess = true) {
  if (!structured?.items?.length) return null;

  if (structured.type === "quiz") {
    const questions = structured.items
      .map((item) => ({
        question: String(item.question ?? "").trim(),
        options: Array.isArray(item.options)
          ? item.options.map((option) => String(option).trim()).filter(Boolean)
          : [],
        correctIndex: Number(item.correctIndex ?? item.correct_index ?? 0),
        explanation: String(item.explanation ?? "").trim(),
      }))
      .filter((item) => (
        item.question
        && item.options.length >= 2
        && Number.isInteger(item.correctIndex)
        && item.correctIndex >= 0
        && item.correctIndex < item.options.length
      ));
    if (!questions.length) throw new Error("Quiz khong co cau hoi hop le de luu.");

    const topic = sourceText.replace(/\s+/g, " ").trim().slice(0, 60);
    const saved = await quizApi.saveFromChat({
      title: topic ? `Quiz AI - ${topic}` : `Quiz AI ${new Date().toLocaleDateString("vi")}`,
      description: "Tu dong tao va luu tu StudyMate AI chat",
      questions,
    });
    if (showSuccess) toast.success("Da tu dong luu quiz");
    return { type: "quiz", id: saved.id };
  }

  if (structured.type === "flashcard") {
    const cards = structured.items.map((item) => ({
      question: item.question ?? item.front ?? "",
      answer: item.answer ?? item.back ?? "",
    }));
    const saved = await flashcardApi.createPersonalDeck({
      title: `Flashcard chat ${new Date().toLocaleDateString("vi")}`,
      description: "Tu dong tao va luu tu StudyMate AI chat",
      cards,
    });
    if (showSuccess) toast.success("Da tu dong luu flashcard");
    return { type: "flashcard", id: saved.id };
  }

  return null;
}

export default function FloatingAgent() {
  const user = useAuthStore((state) => state.user);
  const darkMode = useUiStore((state) => state.darkMode);
  const theme = darkMode
    ? {
        panel: '#16161d', header: '#1b1b24', surface: '#1e1e28', input: '#252532',
        border: 'rgba(255,255,255,.09)', text: '#f0f0f5', muted: '#9a9aad', faint: '#66667a',
        shadow: '0 24px 70px rgba(0,0,0,.48)',
      }
    : {
        panel: '#ffffff', header: '#f8f9fc', surface: '#f4f5f9', input: '#f7f7fb',
        border: 'rgba(15,23,42,.11)', text: '#172033', muted: '#667085', faint: '#98a2b3',
        shadow: '0 24px 70px rgba(15,23,42,.18)',
      };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [unread, setUnread] = useState(0);
  const [showQuick, setShowQuick] = useState(true);
  const [aiConfig, setAiConfig] = useState(() => getAiConfig());
  const [providers, setProviders] = useState([]);
  const [validatingKey, setValidatingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || "");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    loadAiProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setShowQuick(false);
    setLoading(true);
    setActiveAgent(null);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: msg, time: timeNow() },
    ]);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: getAiRequestHeaders(true),
        body: JSON.stringify(withAiConfig({
          text: msg,
          session_id: sessionId || undefined,
          account_id: user?.id || undefined,
          tenant_id: user?.id ? `user:${user.id}` : undefined,
        })),
      });
      const data = await readAiResponse(res);
      if (data.error) {
        const error = new Error(data.error.message || "AI không thể xử lý yêu cầu.");
        error.code = data.error.code;
        error.retryable = data.error.retryable;
        throw error;
      }
      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem(SESSION_KEY, data.session_id);
      }

      let savedResource = null;
      if (data.structured?.type === "quiz" || data.structured?.type === "flashcard") {
        try {
          savedResource = await persistStructured(data.structured, msg);
        } catch (error) {
          toast.error(error?.response?.data?.message ?? "Khong the tu dong luu. Hay dang nhap va thu lai.");
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: data.response ?? "Không có phản hồi.",
          badge: data.agent ? AGENT_MAP[data.agent] ?? data.agent : null,
          structured: data.structured ?? null,
          autoSaved: Boolean(savedResource),
          savedResource,
          time: timeNow(),
        },
      ]);

      if (!open) setUnread((n) => n + 1);
      setActiveAgent(data.agent ?? null);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: `❌ ${error?.code ? `[${error.code}] ` : ""}${error instanceof Error
            ? error.message
            : "Không thể kết nối AI service tại cổng 8001. Kiểm tra FastAPI đang chạy chưa."}`,
          time: timeNow(),
        },
      ]);
      setActiveAgent(null);
    }

    setLoading(false);
    setTimeout(() => setActiveAgent(null), 2000);
  }, [input, loading, open, sessionId, user?.id]);

  const saveProviderConfig = async () => {
    if (!aiConfig.api_key.trim()) {
      clearAiConfig();
      setAiConfig(getAiConfig());
      toast.success("Đã dùng lại hạn mức AI miễn phí của hệ thống");
      return;
    }
    setValidatingKey(true);
    try {
      const validated = await validateAiConfig({ ...aiConfig, validated: false });
      saveAiConfig(validated);
      setAiConfig(validated);
      toast.success("Đã lưu API key trên trình duyệt của bạn");
    } catch (error) {
      setAiConfig((current) => ({ ...current, validated: false }));
      toast.error(error instanceof Error ? error.message : "Không xác thực được API key");
    } finally {
      setValidatingKey(false);
    }
  };

  const selectedProvider = providers.find((item) => item.id === aiConfig.provider);

  const saveStructured = async (msg) => {
    if (!msg.structured) return;
    try {
      if (msg.structured.type === "quiz") {
        const questions = msg.structured.items.map((item) => ({
          question: item.question ?? "",
          options: item.options ?? [],
          correctIndex: item.correct_index ?? item.correctIndex ?? 0,
          explanation: item.explanation ?? "",
        }));
        await quizApi.createPersonalQuizSet({
          title: `Quiz chat ${new Date().toLocaleDateString("vi")}`,
          questions,
        });
        toast.success("Đã lưu quiz — xem tại mục Quiz");
      } else if (msg.structured.type === "flashcard") {
        const cards = msg.structured.items.map((item) => ({
          question: item.front ?? item.question ?? "",
          answer: item.back ?? item.answer ?? "",
        }));
        await flashcardApi.createPersonalDeck({
          title: `Flashcard chat ${new Date().toLocaleDateString("vi")}`,
          cards,
        });
        toast.success("Đã lưu flashcard");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Không thể lưu — cần đăng nhập");
    }
  };

  const clearHistory = async () => {
    try {
      await fetch(`${API_URL}/history`, {
        method: "DELETE",
        headers: getAiRequestHeaders(),
      });
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    setSessionId("");
    setMessages([]);
    setShowQuick(true);
    setActiveAgent(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @keyframes smFadeUp {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes smBounce {
          0%,80%,100% { transform:translateY(0); opacity:0.4; }
          40%          { transform:translateY(-5px); opacity:1; }
        }
        @keyframes smPop {
          0%   { transform:scale(0.82) translateY(16px); opacity:0; }
          100% { transform:scale(1) translateY(0); opacity:1; }
        }
        @keyframes smPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
          50%      { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
        }
        @keyframes smRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .sm-fab-ring {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: rgba(167,139,250,0.6);
          border-right-color: rgba(167,139,250,0.2);
          animation: smRotate 3s linear infinite;
        }
        .sm-textarea:focus { outline: none; }
        .sm-panel, .sm-panel button, .sm-panel input, .sm-panel select, .sm-panel textarea {
          font-family: 'Nunito', 'Inter', sans-serif !important;
        }
        @media (max-width: 640px) {
          .sm-fab { right: 16px !important; bottom: 16px !important; width: 46px !important; height: 46px !important; }
          .sm-panel {
            right: 16px !important;
            bottom: 76px !important;
            width: calc(100vw - 32px) !important;
            max-height: calc(100dvh - 92px) !important;
          }
        }
        .sm-quick-btn:hover {
          background: rgba(124,58,237,0.12) !important;
          border-color: rgba(124,58,237,0.4) !important;
          color: #a78bfa !important;
        }
        .sm-send:hover:not(:disabled) { background: #6d28d9 !important; transform: scale(1.06); }
        .sm-send:disabled { background: var(--sm-border) !important; cursor: not-allowed; }
        .sm-messages::-webkit-scrollbar { width: 3px; }
        .sm-messages::-webkit-scrollbar-thumb { background: var(--sm-border); border-radius: 3px; }
      `}</style>

      {/* ── FAB Button ── */}
      <button
        className="sm-fab"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed", bottom: 72, right: 28, zIndex: 9999,
          width: 54, height: 54, borderRadius: "50%",
          background: open ? theme.surface : "#7c3aed",
          border: open ? `1px solid ${theme.border}` : "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          animation: !open && messages.length === 0 ? "smPulse 2.5s infinite" : "none",
        }}
        title="StudyMind AI"
      >
        {/* Spinning ring khi đóng */}
        {!open && <div className="sm-fab-ring" />}

        {/* AI icon */}
        <div style={{
          position: "absolute",
          transition: "opacity 0.2s, transform 0.2s",
          opacity: open ? 0 : 1,
          transform: open ? "rotate(90deg) scale(0.6)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AIIcon size={24} color="#ffffff" />
        </div>

        {/* Close icon */}
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="#a78bfa"
          strokeWidth="2.5" strokeLinecap="round"
          style={{
            position: "absolute",
            transition: "opacity 0.2s, transform 0.2s",
            opacity: open ? 1 : 0,
            transform: open ? "none" : "rotate(-90deg) scale(0.6)",
          }}
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>

        {/* Unread badge */}
        {unread > 0 && !open && (
          <div style={{
            position: "absolute", top: -4, right: -4,
            width: 18, height: 18, borderRadius: "50%",
            background: "#e74c3c", color: "white",
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Nunito', 'Inter', sans-serif",
            animation: "smFadeUp 0.2s ease",
          }}>
            {unread}
          </div>
        )}
      </button>

      {/* ── Chat Panel ── */}
      {open && (
        <div className="sm-panel" style={{
          position: "fixed", bottom: 140, right: 28, zIndex: 9998,
          width: 410, maxHeight: "calc(100dvh - 168px)",
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "smPop 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          fontFamily: "'Nunito', 'Inter', sans-serif",
          boxShadow: theme.shadow,
          color: theme.text,
          '--sm-panel': theme.panel,
          '--sm-header': theme.header,
          '--sm-surface': theme.surface,
          '--sm-input': theme.input,
          '--sm-border': theme.border,
          '--sm-text': theme.text,
          '--sm-muted': theme.muted,
          '--sm-faint': theme.faint,
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--sm-border)",
            background: "var(--sm-header)",
            display: "flex", alignItems: "center", gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <AIIcon size={21} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Nunito', 'Inter', sans-serif",
                fontSize: 15, fontWeight: 700, color: "#8b5cf6",
              }}>
                StudyMind
              </div>
              <div style={{
                fontFamily: "'Nunito', 'Inter', sans-serif",
                fontSize: 12, color: "var(--sm-muted)", marginTop: 2,
              }}>
                multi-agent · nhãn môn học
              </div>
            </div>

            {/* Agent dots — 6 chuyên gia, không hiển thị Orchestrator/Classifier */}
            <div style={{ display: "flex", gap: 5 }}>
              {ACTIVE_AGENTS.map((key) => (
                <div key={key} title={AGENT_MAP[key]} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: activeAgent === key ? "#7c3aed" : "#2a2a2a",
                  boxShadow: activeAgent === key ? "0 0 6px #7c3aed" : "none",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>

            <button
              onClick={() => setShowApiKey((v) => !v)}
              title="API key cá nhân"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: aiConfig.validated ? "#22c55e" : aiConfig.api_key ? "#f59e0b" : "#444",
                padding: 4, borderRadius: 6,
                transition: "color 0.15s", display: "flex", alignItems: "center",
                fontFamily: "'Nunito', 'Inter', sans-serif", fontSize: 11,
              }}
            >
              KEY
            </button>

            <button
              onClick={clearHistory}
              title="Xóa lịch sử"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--sm-faint)", padding: 4, borderRadius: 6,
                transition: "color 0.15s", display: "flex", alignItems: "center",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#c0392b"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#444"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>

          {showApiKey && (
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--sm-border)",
              background: "var(--sm-surface)",
              display: "grid",
              gap: 8,
            }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const provider = providers.find((item) => item.id === e.target.value);
                    setAiConfig((current) => ({
                      ...current,
                      provider: e.target.value,
                      model: provider?.default_model || "",
                      validated: false,
                    }));
                  }}
                  style={{ flex: 1, background: "var(--sm-input)", color: "var(--sm-text)", border: "1px solid var(--sm-border)", borderRadius: 8, padding: 8 }}
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig((current) => ({ ...current, model: e.target.value, validated: false }))}
                  style={{ flex: 1.4, background: "var(--sm-input)", color: "var(--sm-text)", border: "1px solid var(--sm-border)", borderRadius: 8, padding: 8 }}
                >
                  {(selectedProvider?.models || []).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}{model.tier === "free" ? " (free)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  value={aiConfig.api_key}
                  onChange={(e) => setAiConfig((current) => ({ ...current, api_key: e.target.value, validated: false }))}
                  placeholder={aiConfig.provider === "anthropic" ? "Anthropic key (sk-ant-...)" : "OpenRouter key (sk-or-...)"}
                  style={{
                    flex: 1,
                    background: "var(--sm-input)",
                    border: "1px solid var(--sm-border)",
                    borderRadius: 8,
                    color: "var(--sm-text)",
                    padding: "8px 10px",
                    fontSize: 11,
                    fontFamily: "'Nunito', 'Inter', sans-serif",
                  }}
                />
                <button
                  onClick={saveProviderConfig}
                  disabled={validatingKey}
                  style={{
                    background: "#7c3aed",
                    border: "none",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 11,
                    cursor: validatingKey ? "wait" : "pointer",
                    fontFamily: "'Nunito', 'Inter', sans-serif",
                  }}
                >
                  {validatingKey ? "Kiểm tra..." : "Lưu"}
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, color: aiConfig.validated ? "#22c55e" : "var(--sm-muted)", fontSize: 11 }}>
                {aiConfig.validated
                  ? "Đã xác thực. Key này được dùng cho chat, tài liệu, quiz, flashcard và từ vựng."
                  : "Bạn có thể thêm API key cá nhân hoặc nạp token AI để tiếp tục sử dụng."}
                {!aiConfig.validated && (
                  <button type="button" onClick={() => { window.location.href = "/membership"; }} style={{ background: "rgba(124,58,237,.14)", border: "1px solid rgba(124,58,237,.3)", color: "#a78bfa", borderRadius: 8, padding: "6px 9px", cursor: "pointer", fontSize: 11 }}>
                    Nạp token AI
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            className="sm-messages"
            style={{
              flex: 1, overflowY: "auto", padding: "14px 14px 10px",
              display: "flex", flexDirection: "column", gap: 12,
              minHeight: 200,
            }}
          >
            {isEmpty ? (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: "100%", gap: 10, color: "var(--sm-muted)",
                fontFamily: "'Nunito', 'Inter', sans-serif", textAlign: "center", padding: 20,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <AIIcon size={26} color="#7c3aed" />
                </div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: "var(--sm-text)" }}>
                  Chào mừng đến StudyMind
                </div>
                <div style={{ fontSize: 12, color: "var(--sm-muted)", marginTop: 3 }}>
                  Tutor · KT · Quiz · Summary · Flashcard
                </div>
              </div>
            ) : (
              messages.map((msg) => <Message key={msg.id} msg={msg} onSaveStructured={saveStructured} />)
            )}
            {loading && <ThinkingBubble />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {showQuick && isEmpty && (
            <div style={{
              padding: "8px 12px",
              borderTop: "1px solid var(--sm-border)",
              display: "flex", flexWrap: "wrap", gap: 5,
              flexShrink: 0,
            }}>
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.text}
                  className="sm-quick-btn"
                  onClick={() => sendMessage(q.text)}
                  style={{
                    background: "none",
                    border: "1px solid var(--sm-border)",
                    color: "var(--sm-muted)",
                    padding: "6px 11px",
                    borderRadius: 20,
                    fontFamily: "'Nunito', 'Inter', sans-serif",
                    fontSize: 12, cursor: "pointer",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {q.icon} {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "12px 14px 14px",
            borderTop: "1px solid var(--sm-border)",
            background: "var(--sm-panel)",
            flexShrink: 0,
          }}>
            <div
              style={{
                display: "flex", gap: 8, alignItems: "flex-end",
                background: "var(--sm-input)",
                border: "1px solid var(--sm-border)",
                borderRadius: 12, padding: "10px 12px",
                transition: "border-color 0.2s",
              }}
              onFocusCapture={(e) => e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = theme.border}
            >
              <textarea
                ref={textareaRef}
                className="sm-textarea"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi bất cứ điều gì..."
                rows={1}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--sm-text)", fontFamily: "'Nunito', 'Inter', sans-serif",
                  fontSize: 15, resize: "none", lineHeight: 1.5,
                  minHeight: 28, maxHeight: 110, overflow: "auto",
                }}
              />
              <button
                className="sm-send"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: "#7c3aed", border: "none",
                  color: "#fff", cursor: "pointer", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
            <div style={{
              fontFamily: "'Nunito', 'Inter', sans-serif",
              fontSize: 12, color: "var(--sm-muted)",
              textAlign: "center", marginTop: 6,
            }}>
              Enter để gửi · Shift+Enter xuống dòng
            </div>
          </div>
        </div>
      )}
    </>
  );
}
