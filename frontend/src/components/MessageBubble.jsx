import { Sparkles, User } from "lucide-react";
import { getModeConfig } from "../config/modes";

const SAFETY_SECTIONS = ["Hazards:", "Recommended PPE/actions:", "Unknowns:"];
const SLIDE_SECTIONS = [
  "Title:",
  "Key bullets:",
  "Numbers & trends:",
  "Action items:",
  "Unknowns:",
];

const splitParagraphs = (text) =>
  text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseStructuredSections = (text, sections) => {
  const lines = text.split("\n");
  const parsed = {};
  let currentSection = null;

  sections.forEach((section) => {
    parsed[section] = [];
  });

  for (const line of lines) {
    const trimmed = line.trim();
    const matchedSection = sections.find((section) => trimmed.toLowerCase() === section.toLowerCase());

    if (matchedSection) {
      currentSection = matchedSection;
      continue;
    }

    if (!currentSection || !trimmed) {
      continue;
    }

    parsed[currentSection].push(trimmed.replace(/^[-*]\s*/, ""));
  }

  return parsed;
};

const extractSeverity = (item) => {
  const match = item.match(/\b(low|medium|high)\b/i);
  return match ? match[1].toLowerCase() : null;
};

const getSeverityClasses = (severity) => {
  if (severity === "high") {
    return "border-rose-300/30 bg-rose-400/15 text-rose-100";
  }
  if (severity === "medium") {
    return "border-amber-300/30 bg-amber-400/15 text-amber-100";
  }
  if (severity === "low") {
    return "border-emerald-300/30 bg-emerald-400/15 text-emerald-100";
  }
  return "border-white/10 bg-white/5 text-slate-200";
};

const StructuredList = ({ items, showSeverity = false }) => {
  if (!items.length) {
    return <p className="text-sm text-slate-400">Nothing specific was returned for this section.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const severity = showSeverity ? extractSeverity(item) : null;

        return (
          <li key={`${item}-${index}`} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-slate-100">
            <div className="flex flex-wrap items-start gap-2">
              {severity && (
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${getSeverityClasses(severity)}`}
                >
                  {severity}
                </span>
              )}
              <span className="flex-1">{item}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const GeneralAnswer = ({ content }) => {
  const paragraphs = splitParagraphs(content);
  const lead = paragraphs[0] || content;
  const remainder = paragraphs.slice(1);

  return (
    <div className="space-y-3">
      <p className="text-base leading-relaxed text-white">{lead}</p>
      {remainder.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-relaxed text-slate-200">
          {paragraph}
        </p>
      ))}
    </div>
  );
};

const SafetyAnswer = ({ content }) => {
  const sections = parseStructuredSections(content, SAFETY_SECTIONS);

  if (!Object.values(sections).some((items) => items.length)) {
    return <GeneralAnswer content={content} />;
  }

  return (
    <div className="space-y-3">
      {SAFETY_SECTIONS.map((section) => (
        <div key={section} className="rounded-2xl border border-white/10 bg-black/10 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
            {section.replace(":", "")}
          </div>
          <StructuredList items={sections[section]} showSeverity={section === "Hazards:"} />
        </div>
      ))}
    </div>
  );
};

const SlideSummaryAnswer = ({ content }) => {
  const sections = parseStructuredSections(content, SLIDE_SECTIONS);

  if (!Object.values(sections).some((items) => items.length)) {
    return <GeneralAnswer content={content} />;
  }

  const title = sections["Title:"][0] || "Slide summary";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="text-xs uppercase tracking-[0.16em] text-emerald-200">Title</div>
        <div className="mt-2 text-lg font-semibold text-white">{title}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4 md:col-span-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Key bullets
          </div>
          <StructuredList items={sections["Key bullets:"]} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Numbers & trends
          </div>
          <StructuredList items={sections["Numbers & trends:"]} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Action items
          </div>
          <StructuredList items={sections["Action items:"]} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4 md:col-span-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            Unknowns
          </div>
          <StructuredList items={sections["Unknowns:"]} />
        </div>
      </div>
    </div>
  );
};

const AssistantAnswer = ({ message }) => {
  if (message.meta?.mode === "safety") {
    return <SafetyAnswer content={message.content} />;
  }

  if (message.meta?.mode === "slide_summary") {
    return <SlideSummaryAnswer content={message.content} />;
  }

  return <GeneralAnswer content={message.content} />;
};

const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";
  const modeConfig = getModeConfig(message.meta?.mode);
  const Icon = isUser ? User : modeConfig.resultIcon || Sparkles;
  const bubbleClasses = isUser
    ? "ml-auto border border-sky-300/20 bg-sky-500/15 text-sky-50 shadow-glow"
    : `mr-auto ${modeConfig.accent.card} text-white shadow-lg`;

  const metaParts = [];
  if (message.meta?.provider) metaParts.push(`Provider: ${message.meta.provider}`);
  if (message.meta?.model) metaParts.push(`Model: ${message.meta.model}`);
  if (message.meta?.usage) {
    const usageParts = [];
    if (message.meta.usage.prompt_tokens != null) {
      usageParts.push(`prompt ${message.meta.usage.prompt_tokens}`);
    }
    if (message.meta.usage.completion_tokens != null) {
      usageParts.push(`completion ${message.meta.usage.completion_tokens}`);
    }
    if (message.meta.usage.total_tokens != null) {
      usageParts.push(`total ${message.meta.usage.total_tokens}`);
    }
    if (usageParts.length) {
      metaParts.push(`Tokens: ${usageParts.join(", ")}`);
    }
  }
  if (message.meta?.latencyMs !== undefined && message.meta.latencyMs !== null) {
    metaParts.push(`Latency: ${message.meta.latencyMs}ms`);
  }
  if (message.meta?.backendMode) {
    const backendLabels = {
      stub: "stub model",
      ollama: "local model",
      remote: "remote model",
    };
    const label = backendLabels[message.meta.backendMode] || message.meta.backendMode;
    metaParts.push(`Answer generated by ${label}`);
    if (message.meta?.fallbackReason) {
      metaParts.push(`Fallback: ${message.meta.fallbackReason}`);
    }
  }
  const metaText = metaParts.join(" | ");

  return (
    <div className={`max-w-[96%] rounded-[28px] p-4 mb-3 backdrop-blur ${bubbleClasses}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-200/80">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${isUser ? "bg-sky-300/15 text-sky-100" : modeConfig.accent.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span>{isUser ? "You" : "Assistant"}</span>
        {message.meta?.mode && (
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${modeConfig.accent.badge}`}>
            {modeConfig.label}
          </span>
        )}
        {!isUser && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300/80">
            Focus: {modeConfig.focusLabel}
          </span>
        )}
      </div>

      <div className="mt-3">
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <AssistantAnswer message={message} />
        )}
      </div>

      {metaText && <p className="mt-3 text-[11px] text-slate-200/75">{metaText}</p>}
    </div>
  );
};

export default MessageBubble;
