import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { quizApi, flashcardApi } from "@/api/services";
import {
  clearAiConfig,
  getAiConfig,
  loadAiProviders,
  saveAiConfig,
  validateAiConfig,
  withAiConfig,
} from "@/utils/aiConfig";
import { useAuthStore } from "@/store/authStore";

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
      <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "#444", marginBottom: 5 }}>
        StudyMind · {timeNow()}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", background: "#141414",
        border: "1px solid #2a2a2a", borderRadius: "2px 10px 10px 10px",
        color: "#555", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace"
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

function StructuredPreview({ structured }) {
  if (!structured?.items?.length) return null;

  if (structured.type === "flashcard") {
    return (
      <div style={{ display: "grid", gap: 7 }}>
        {structured.items.map((item, index) => (
          <div key={`${item.front || item.question}-${index}`} style={{
            padding: "9px 10px",
            borderRadius: 8,
            background: "#101010",
            border: "1px solid #2a2a2a",
          }}>
            <div style={{ color: "#a78bfa", fontWeight: 600, marginBottom: 3 }}>
              {index + 1}. {item.front || item.question}
            </div>
            <div style={{ color: "#ddd", whiteSpace: "pre-line" }}>
              {item.back || item.answer}
            </div>
            {item.hint && (
              <div style={{ color: "#666", fontSize: 11, marginTop: 3 }}>
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
            background: "#101010",
            border: "1px solid #2a2a2a",
          }}>
            <div style={{ color: "#a78bfa", fontWeight: 600 }}>
              {index + 1}. {item.question}
            </div>
            <div style={{ color: "#aaa", fontSize: 11, marginTop: 3 }}>
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
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
        color: "#444", marginBottom: 5,
        textAlign: isUser ? "right" : "left"
      }}>
        {isUser ? "Bạn" : "StudyMind"} · {msg.time}
      </div>
      {msg.badge && (
        <div style={{
          display: "inline-block", fontSize: 10, padding: "2px 7px",
          borderRadius: 4, marginBottom: 6,
          background: "rgba(124,58,237,0.15)", color: "#a78bfa",
          border: "1px solid rgba(124,58,237,0.3)",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {msg.badge}
        </div>
      )}
      <div style={{
        padding: "10px 14px", fontSize: 13, lineHeight: 1.7,
        borderRadius: isUser ? "10px 10px 2px 10px" : "2px 10px 10px 10px",
        background: isUser ? "#1a1525" : "#141414",
        border: isUser ? "1px solid #2d1f4e" : "1px solid #2a2a2a",
        color: "#e8e0d0",
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
            marginTop: 6, fontSize: 11, padding: "4px 10px", borderRadius: 6,
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
            marginTop: 6, marginLeft: 6, fontSize: 11, padding: "4px 10px", borderRadius: 6,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withAiConfig({
          text: msg,
          session_id: sessionId || undefined,
          account_id: user?.id || undefined,
          tenant_id: user?.id ? `user:${user.id}` : undefined,
        })),
      });
      const data = await res.json();
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
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: "❌ Không thể kết nối server. Kiểm tra FastAPI đang chạy chưa?",
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
    try { await fetch(`${API_URL}/history`, { method: "DELETE" }); } catch {}
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
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Lora:wght@400;600&display=swap');
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
        .sm-quick-btn:hover {
          background: rgba(124,58,237,0.12) !important;
          border-color: rgba(124,58,237,0.4) !important;
          color: #a78bfa !important;
        }
        .sm-send:hover:not(:disabled) { background: #6d28d9 !important; transform: scale(1.06); }
        .sm-send:disabled { background: #2a2a2a !important; cursor: not-allowed; }
        .sm-messages::-webkit-scrollbar { width: 3px; }
        .sm-messages::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
      `}</style>

      {/* ── FAB Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          width: 54, height: 54, borderRadius: "50%",
          background: open ? "#1a1025" : "#7c3aed",
          border: open ? "1px solid #7c3aed" : "none",
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
            fontSize: 10, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'IBM Plex Mono', monospace",
            animation: "smFadeUp 0.2s ease",
          }}>
            {unread}
          </div>
        )}
      </button>

      {/* ── Chat Panel ── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 28, zIndex: 9998,
          width: 380, maxHeight: 580,
          background: "#0f0f0f",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "smPop 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          fontFamily: "'Lora', Georgia, serif",
        }}>

          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1e1e1e",
            background: "#111",
            display: "flex", alignItems: "center", gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <AIIcon size={18} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13, fontWeight: 600, color: "#a78bfa",
              }}>
                StudyMind
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, color: "#444", marginTop: 1,
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
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              }}
            >
              KEY
            </button>

            <button
              onClick={clearHistory}
              title="Xóa lịch sử"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#444", padding: 4, borderRadius: 6,
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
              borderBottom: "1px solid #1e1e1e",
              background: "#101010",
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
                  style={{ flex: 1, background: "#0b0b0b", color: "#ddd", border: "1px solid #2a2a2a", borderRadius: 8, padding: 8 }}
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig((current) => ({ ...current, model: e.target.value, validated: false }))}
                  style={{ flex: 1.4, background: "#0b0b0b", color: "#ddd", border: "1px solid #2a2a2a", borderRadius: 8, padding: 8 }}
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
                    background: "#0b0b0b",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    color: "#ddd",
                    padding: "8px 10px",
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
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
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {validatingKey ? "Kiểm tra..." : "Lưu"}
                </button>
              </div>
              <div style={{ color: aiConfig.validated ? "#22c55e" : "#666", fontSize: 10 }}>
                {aiConfig.validated
                  ? "Đã xác thực. Key này được dùng cho chat, tài liệu, quiz, flashcard và từ vựng."
                  : "Để trống key để dùng hạn mức free của hệ thống."}
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
                height: "100%", gap: 10, color: "#555",
                fontFamily: "'IBM Plex Mono', monospace", textAlign: "center", padding: 20,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <AIIcon size={26} color="#7c3aed" />
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: 15, color: "#e8e0d0" }}>
                  Chào mừng đến StudyMind
                </div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
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
              borderTop: "1px solid #1a1a1a",
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
                    border: "1px solid #2a2a2a",
                    color: "#666",
                    padding: "4px 9px",
                    borderRadius: 20,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11, cursor: "pointer",
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
            padding: "10px 12px 12px",
            borderTop: "1px solid #1a1a1a",
            background: "#0f0f0f",
            flexShrink: 0,
          }}>
            <div
              style={{
                display: "flex", gap: 8, alignItems: "flex-end",
                background: "#181818",
                border: "1px solid #2a2a2a",
                borderRadius: 10, padding: "8px 10px",
                transition: "border-color 0.2s",
              }}
              onFocusCapture={(e) => e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = "#2a2a2a"}
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
                  color: "#e8e0d0", fontFamily: "'Lora', serif",
                  fontSize: 13, resize: "none", lineHeight: 1.6,
                  minHeight: 22, maxHeight: 100, overflow: "auto",
                }}
              />
              <button
                className="sm-send"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  width: 32, height: 32, borderRadius: 8,
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
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "#333",
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
