import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, Info, RefreshCcw, Send, Settings2, Wand2 } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import BackendSelector from "./components/BackendSelector";
import ImageUploader from "./components/ImageUploader";
import ModeSelector from "./components/ModeSelector";
import { API_BASE_URL } from "./api/config";
import { askQuestion } from "./api/client";
import { MODE_OPTIONS, getModeConfig } from "./config/modes";

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
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSubmittedQuestion, setLastSubmittedQuestion] = useState("");
  const textareaRef = useRef(null);

  const currentMode = getModeConfig(mode);
  const compareModes = MODE_OPTIONS.filter((option) => option.value !== mode);
  const CurrentModeIcon = currentMode.icon;

  const resetSession = () => {
    setImagePreview(null);
    setMessages([]);
    setQuestionInput("");
    setIsImageProcessing(false);
    setLastSubmittedQuestion("");
    setError(null);
  };

  const handleImageSelected = (dataUrl) => {
    if (!dataUrl) return;
    setImagePreview(dataUrl);
    setMessages([]);
    setError(null);
  };

  const handleImageProcessingChange = (isProcessing) => {
    setIsImageProcessing(isProcessing);
    if (isProcessing) {
      setImagePreview(null);
      setMessages([]);
      setError(null);
    }
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

  const submitQuestion = async (question, requestedMode) => {
    const userMessage = {
      role: "user",
      content: question,
      meta: { mode: requestedMode },
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestionInput("");
    setIsLoading(true);
    setError(null);
    setLastSubmittedQuestion(question);

    const response = await askQuestion({
      question,
      mode: requestedMode,
      image: imagePreview,
    });

    if (!response.ok) {
      const message = response.error || "Something went wrong. Please try again.";
      setError(message);
      setIsLoading(false);
      return;
    }

    const payload = response.data;
    const resolvedMode = payload.mode || requestedMode;
    const meta = {
      latencyMs: payload.latency_ms,
      model: payload.model,
      mode: resolvedMode,
      provider: payload.provider,
      usage: payload.usage,
      backendMode: payload.backendMode || payload.backend_mode,
      fallbackReason: payload.fallbackReason || payload.fallback_reason,
    };

    if (Array.isArray(payload.history) && payload.history.length) {
      const historyWithMeta = payload.history.map((message, index, history) => {
        const nextMessage = { ...message };
        if (message.role === "assistant") {
          nextMessage.meta = meta;
        }
        if (message.role === "user" && !nextMessage.meta?.mode) {
          nextMessage.meta = { ...(nextMessage.meta || {}), mode: resolvedMode };
        }
        if (index === history.length - 1 && message.role === "assistant") {
          nextMessage.meta = meta;
        }
        return nextMessage;
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

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = questionInput.trim();
    const validationMessage = isImageProcessing
      ? "Wait for the image to finish processing."
      : !trimmed
        ? "Type a question to ask the assistant."
        : !imagePreview
          ? "Upload an image to ask the vision model."
          : null;
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    await submitQuestion(trimmed, mode);
  };

  const handleModeChange = (value) => {
    setMode(value);
    setError(null);
  };

  const handleBackendChange = (value) => {
    setBackend(value);
    window.localStorage.setItem("mmva-backend", value);
  };

  const handleStarterPrompt = (prompt) => {
    setQuestionInput(prompt);
    setError(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      autoSizeTextarea();
    });
  };

  const handleCompareMode = async (nextMode) => {
    if (!lastSubmittedQuestion || !imagePreview || isLoading) {
      return;
    }

    setMode(nextMode);
    await submitQuestion(lastSubmittedQuestion, nextMode);
  };

  const validationMessage = !questionInput.trim()
    ? "Choose a lens, upload an image, and try one of the starter prompts."
    : isImageProcessing
      ? "Optimizing image for upload..."
      : !imagePreview
        ? "Upload an image to send with your question."
        : null;
  const isSendDisabled = isLoading || isImageProcessing || !questionInput.trim() || !imagePreview;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-mesh-gradient animate-floaty opacity-90" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/30 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="glass-panel px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="uppercase tracking-[0.2em] text-xs text-sky-200 flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Vision + Language
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              Show the same image through <span className="text-gradient">different lenses</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-3xl">
              This demo uses one image and three response modes, so reviewers can instantly compare
              descriptive, safety, and slide-summary outputs.
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

        <main className="grid gap-4 lg:grid-cols-[400px,1fr] xl:grid-cols-[430px,1fr]">
          <section className="glass-panel p-4 space-y-4 self-start lg:sticky lg:top-6">
            <ImageUploader
              onFileSelected={handleImageSelected}
              imagePreview={imagePreview}
              onProcessingChange={handleImageProcessingChange}
            />
            <ModeSelector mode={mode} onChange={handleModeChange} disabled={isLoading} />

            <div className={`rounded-2xl border p-4 ${currentMode.accent.card}`}>
              <div className="flex items-center gap-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${currentMode.accent.icon}`}>
                  <CurrentModeIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className={`text-xs uppercase tracking-[0.18em] ${currentMode.accent.subtle}`}>
                    Starter Prompts
                  </div>
                  <div className="text-base font-semibold text-white">
                    Make the {currentMode.label.toLowerCase()} mode shine
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {currentMode.starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleStarterPrompt(prompt)}
                    className={`rounded-full border px-3 py-2 text-left text-sm text-white transition ${currentMode.accent.button}`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-4 border-dashed border-white/15 bg-white/5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Info className="h-4 w-4 text-sky-200" />
                Portfolio Notes
              </div>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                <li>- The image preview stays visible on desktop while you review answers.</li>
                <li>- Each mode has its own prompt strategy, accent styling, and answer layout.</li>
                <li>- Use the compare controls on the right to rerun the same question in another lens.</li>
              </ul>
              <p className="text-xs text-slate-400 mt-3">
                Supported formats: JPEG, PNG, WEBP. Images are resized automatically before upload.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">API: {API_BASE_URL}</p>
            </div>

            <BackendSelector value={backend} onChange={handleBackendChange} disabled={isLoading} />
          </section>

          <section className="glass-panel p-4 flex flex-col gap-4 min-h-[620px]">
            <div className={`rounded-3xl border p-4 ${currentMode.accent.card}`}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${currentMode.accent.badge}`}>
                    <CurrentModeIcon className="h-3.5 w-3.5" />
                    {currentMode.eyebrow}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-semibold ${currentMode.accent.title}`}>
                      {currentMode.label} Output
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-200">{currentMode.description}</p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-300/85">
                    What I&apos;m focusing on: {currentMode.focusLabel}
                  </div>
                </div>

                {imagePreview && (
                  <div className="hidden xl:block rounded-2xl border border-white/10 bg-black/10 p-2">
                    <img
                      src={imagePreview}
                      alt="Active uploaded preview"
                      className="h-28 w-28 rounded-xl object-cover"
                    />
                  </div>
                )}
              </div>

              {lastSubmittedQuestion && imagePreview && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Compare this same image and question in another mode
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {compareModes.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleCompareMode(option.value)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${option.accent.button}`}
                        >
                          <OptionIcon className="h-4 w-4" />
                          Run {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <ChatWindow messages={messages} isLoading={isLoading} mode={mode} />
            {isLoading && !error && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${currentMode.accent.badge}`} role="status">
                Building a {currentMode.label.toLowerCase()} answer from the uploaded image...
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
                {error}
              </div>
            )}
            {validationMessage && !error && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="status">
                {validationMessage}
              </div>
            )}
            <form
              className="rounded-3xl border border-white/15 bg-white/5 px-4 py-4 shadow-inner flex flex-col gap-3"
              onSubmit={handleSend}
            >
              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Ask a question
                </div>
                <span className="text-slate-500">Shift + Enter for newline</span>
              </div>
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder={`Try a ${currentMode.label.toLowerCase()} prompt...`}
                  value={questionInput}
                  onChange={(event) => {
                    setError(null);
                    setQuestionInput(event.target.value);
                    autoSizeTextarea();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend(event);
                    }
                  }}
                  disabled={isLoading}
                  aria-label="Question input"
                  className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-300/50 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                />
                <motion.button
                  whileHover={{ scale: isSendDisabled ? 1 : 1.03 }}
                  whileTap={{ scale: isSendDisabled ? 1 : 0.98 }}
                  type="submit"
                  disabled={isSendDisabled}
                  aria-label="Send question"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-900 shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-5 w-5" />
                </motion.button>
              </div>
            </form>
          </section>
        </main>

        <footer className="flex flex-col gap-2 px-2 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            Mode: {currentMode.label} | Focus: {currentMode.focusLabel}
          </div>
          <div>Built as a multimodal portfolio demo for comparing AI response styles.</div>
        </footer>
      </div>
    </div>
  );
}

export default App;
