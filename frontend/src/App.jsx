import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Info, RefreshCcw, Send, Settings2, Wand2 } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import BackendSelector from "./components/BackendSelector";
import ImageUploader from "./components/ImageUploader";
import ModeSelector from "./components/ModeSelector";
import { API_BASE_URL } from "./api/config";
import { askQuestion } from "./api/client";

const getResolvedBackend = () => {
  const stored = window.localStorage.getItem("mmva-backend");
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (stored) {
    if (!isLocalhost && stored === "ollama") {
      window.localStorage.setItem("mmva-backend", "remote");
      return "remote";
    }
    return stored;
  }
  return isLocalhost ? "ollama" : "remote";
};

function App() {
  const [imagePreview, setImagePreview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("general");
  const [backend, setBackend] = useState(() => getResolvedBackend());
  const [questionInput, setQuestionInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [isModelWarming, setIsModelWarming] = useState(false);
  const textareaRef = useRef(null);

  const resetSession = () => {
    setImagePreview(null);
    setMessages([]);
    setSessionId(null);
    setQuestionInput("");
    setError(null);
    setIsModelWarming(false);
  };

  const handleImageSelected = (file) => {
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  const autoSizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    autoSizeTextarea();
  }, [questionInput]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = questionInput.trim();
    const validationMessage = !trimmed ? "Type a question to ask the assistant." : null;
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setQuestionInput("");
    setIsLoading(true);
    setError(null);

    const response = await askQuestion({
      question: trimmed,
    });

    if (!response.ok) {
      const message = response.error || "Something went wrong. Please try again.";
      setError(message);
      setIsModelWarming(/model is loading/i.test(message));
      setIsLoading(false);
      return;
    }

    const payload = response.data;
    setIsModelWarming(false);
    if (payload.session_id) {
      setSessionId(payload.session_id);
    }
    const meta = {
      latencyMs: payload.latency_ms,
      model: payload.model,
      mode: payload.mode,
      provider: payload.provider,
      usage: payload.usage,
      backendMode: payload.backendMode || payload.backend_mode,
      fallbackReason: payload.fallbackReason || payload.fallback_reason,
    };
    if (Array.isArray(payload.history) && payload.history.length) {
      const historyWithMeta = payload.history.map((msg, idx, arr) => {
        const base = { ...msg };
        if (idx === arr.length - 1 && msg.role === "assistant") {
          base.meta = meta;
        }
        return base;
      });
      setMessages(historyWithMeta);
    } else {
      const assistantMessage = {
        role: "assistant",
        content: payload.answer || "No answer returned.",
        meta,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
    setIsLoading(false);
  };

  const handleModeChange = (value) => {
    setMode(value);
    setError(null);
    setIsModelWarming(false);
  };

  const handleBackendChange = (value) => {
    setBackend(value);
    window.localStorage.setItem("mmva-backend", value);
  };

  const validationMessage =
    !questionInput.trim() ? "Type a question to start chatting. Image upload is optional." : null;
  const isSendDisabled = isLoading || !questionInput.trim();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-mesh-gradient animate-floaty opacity-90" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/30 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="glass-panel px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="uppercase tracking-[0.2em] text-xs text-sky-200 flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Vision + Language
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              Ask questions about your <span className="text-gradient">images</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base">
              Upload a photo or screenshot, choose a mode, and chat with a multimodal assistant that understands pixels
              and text.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/about.html"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              About
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              onClick={resetSession}
              aria-label="Start new session"
            >
              <RefreshCcw className="h-4 w-4" />
              New image
            </button>
          </div>
        </header>

        <main className="grid gap-4 lg:grid-cols-[360px,1fr]">
          <section className="glass-panel p-4 space-y-4">
            <ImageUploader onFileSelected={handleImageSelected} imagePreview={imagePreview} />
            <ModeSelector mode={mode} onChange={handleModeChange} disabled={isLoading} />
            <BackendSelector value={backend} onChange={handleBackendChange} disabled={isLoading} />

            <div className="glass-panel p-4 border-dashed border-white/15 bg-white/5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Info className="h-4 w-4 text-sky-200" />
                Quick tips
              </div>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                <li>- Ask about layout: &quot;Describe the objects and their positions.&quot;</li>
                <li>- Safety: &quot;Flag any sensitive content in this screenshot.&quot;</li>
                <li>- Slides: &quot;Summarise the key bullet points from this slide.&quot;</li>
              </ul>
              <p className="text-xs text-slate-400 mt-3">
                Supported formats: JPEG, PNG, WEBP. Session: {sessionId ? sessionId : "not started"}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                API: {API_BASE_URL}
              </p>
            </div>
          </section>

          <section className="glass-panel p-4 flex flex-col gap-3 min-h-[540px]">
            <ChatWindow messages={messages} isLoading={isLoading} />
            {isLoading && !error && !isModelWarming && (
              <div className="rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-100" role="status">
                Waiting for model response...
              </div>
            )}
            {isModelWarming && (
              <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100" role="status">
                Model warm-up in progress. First responses can take a minute or two.
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
                {error}
              </div>
            )}
            {validationMessage && !error && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="status">
                {validationMessage}
              </div>
            )}
            <form
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 shadow-inner flex flex-col gap-3"
              onSubmit={handleSend}
            >
              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Chat input
                </div>
                <span className="text-slate-500">Shift + Enter for newline</span>
              </div>
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Ask a question..."
                  value={questionInput}
                  onChange={(e) => {
                    setError(null);
                    setQuestionInput(e.target.value);
                    autoSizeTextarea();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  disabled={isLoading}
                  aria-label="Question input"
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-300/50 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                />
                <motion.button
                  whileHover={{ scale: isSendDisabled ? 1 : 1.03 }}
                  whileTap={{ scale: isSendDisabled ? 1 : 0.98 }}
                  type="submit"
                  disabled={isSendDisabled}
                  aria-label="Send question"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-900 shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </motion.button>
              </div>
            </form>
          </section>
        </main>

        <footer className="flex items-center justify-between text-sm text-slate-400 px-2">
          <div>Mode: {mode === "safety" ? "Safety" : mode === "slide_summary" ? "Slide summary" : "General"}</div>
          <div>Built for the multimodal assistant demo.</div>
        </footer>
      </div>
    </div>
  );
}

export default App;
