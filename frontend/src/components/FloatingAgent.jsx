import { useState, useRef, useEffect, useCallback } from "react";

const API_URL = "http://localhost:3000";

const AGENT_MAP = {
  Orchestrator: "Orchestrator",
  TutorAgent: "Tutor",
  QuizAgent: "Quiz",
  GroupAgent: "Group",
  SummaryAgent: "Summary",
  FlashcardAgent: "Flashcard",
};

const QUICK_PROMPTS = [
  { icon: "📐", label: "Giải thích tích phân", text: "Giải thích tích phân cho tôi" },
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

// Robot icon SVG
function AIIcon({ size = 22, color = "#0f0f0f" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Đầu robot */}
      <rect x="5" y="8" width="14" height="10" rx="2"/>
      {/* Ăng-ten */}
      <line x1="12" y1="8" x2="12" y2="4"/>
      <circle cx="12" cy="3.5" r="1"/>
      {/* Mắt */}
      <circle cx="9" cy="13" r="1.2" fill={color}/>
      <circle cx="15" cy="13" r="1.2" fill={color}/>
      {/* Miệng */}
      <path d="M9 16.5h6"/>
      {/* Tay */}
      <line x1="5" y1="11" x2="3" y2="13"/>
      <line x1="19" y1="11" x2="21" y2="13"/>
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

function Message({ msg }) {
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
      <div
        style={{
          padding: "10px 14px", fontSize: 13, lineHeight: 1.7,
          borderRadius: isUser ? "10px 10px 2px 10px" : "2px 10px 10px 10px",
          background: isUser ? "#1a1525" : "#141414",
          border: isUser ? "1px solid #2d1f4e" : "1px solid #2a2a2a",
          color: "#e8e0d0",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
      />
    </div>
  );
}

export default function FloatingAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [unread, setUnread] = useState(0);
  const [showQuick, setShowQuick] = useState(true);

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

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setShowQuick(false);
    setLoading(true);
    setActiveAgent("Orchestrator");

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: msg, time: timeNow() },
    ]);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: data.response ?? "Không có phản hồi.",
          badge: data.agent ? AGENT_MAP[data.agent] ?? data.agent : null,
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
  }, [input, loading, open]);

  const clearHistory = async () => {
    try { await fetch(`${API_URL}/history`, { method: "DELETE" }); } catch {}
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
                multi-agent · v2.0
              </div>
            </div>

            {/* Agent dots */}
            <div style={{ display: "flex", gap: 5 }}>
              {Object.values(AGENT_MAP).map((name) => (
                <div key={name} title={name} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: activeAgent && (AGENT_MAP[activeAgent] === name || activeAgent === name)
                    ? "#7c3aed" : "#2a2a2a",
                  boxShadow: activeAgent && (AGENT_MAP[activeAgent] === name || activeAgent === name)
                    ? "0 0 6px #7c3aed" : "none",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>

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
                  Tutor · Quiz · Group · Summary · Flashcard
                </div>
              </div>
            ) : (
              messages.map((msg) => <Message key={msg.id} msg={msg} />)
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