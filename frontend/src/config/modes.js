import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  StickyNote,
} from "lucide-react";

export const MODE_CONFIG = {
  general: {
    value: "general",
    label: "General",
    eyebrow: "Scene Lens",
    hint: "Descriptive answer with visual context",
    description: "Best for scene understanding, object layout, and open-ended image questions.",
    focusLabel: "Scene understanding",
    icon: Sparkles,
    resultIcon: ClipboardList,
    accent: {
      badge: "border-sky-300/30 bg-sky-400/15 text-sky-100",
      card: "border-sky-300/20 bg-sky-400/8",
      icon: "bg-sky-300/20 text-sky-100",
      subtle: "text-sky-200",
      title: "text-sky-50",
      button: "border-sky-300/25 bg-sky-400/10 hover:bg-sky-400/15",
    },
    starterPrompts: [
      "Describe the main objects and where they are positioned.",
      "What stands out most in this image and why?",
      "Explain what is happening in this scene in plain English.",
    ],
  },
  safety: {
    value: "safety",
    label: "Safety",
    eyebrow: "Risk Lens",
    hint: "Hazards, risks, and recommended actions",
    description: "Best for hazard spotting, unsafe behavior, missing PPE, and operational risks.",
    focusLabel: "Hazard review",
    icon: ShieldCheck,
    resultIcon: AlertTriangle,
    accent: {
      badge: "border-amber-300/30 bg-amber-400/15 text-amber-100",
      card: "border-amber-300/20 bg-amber-400/8",
      icon: "bg-amber-300/20 text-amber-100",
      subtle: "text-amber-200",
      title: "text-amber-50",
      button: "border-amber-300/25 bg-amber-400/10 hover:bg-amber-400/15",
    },
    starterPrompts: [
      "Point out any hazards, unsafe behavior, or missing PPE.",
      "What is the biggest safety concern in this image?",
      "List the risks you see and suggest immediate actions.",
    ],
  },
  slide_summary: {
    value: "slide_summary",
    label: "Slides",
    eyebrow: "Briefing Lens",
    hint: "Business-style summary and takeaways",
    description: "Best for slide decks, dashboards, screenshots, and concise executive summaries.",
    focusLabel: "Executive summary",
    icon: StickyNote,
    resultIcon: BarChart3,
    accent: {
      badge: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
      card: "border-emerald-300/20 bg-emerald-400/8",
      icon: "bg-emerald-300/20 text-emerald-100",
      subtle: "text-emerald-200",
      title: "text-emerald-50",
      button: "border-emerald-300/25 bg-emerald-400/10 hover:bg-emerald-400/15",
    },
    starterPrompts: [
      "Summarize this slide into crisp business bullet points.",
      "What are the key metrics, trends, and action items here?",
      "Rewrite the visible content as a short executive briefing.",
    ],
  },
};

export const MODE_OPTIONS = Object.values(MODE_CONFIG);

export const getModeConfig = (mode) => MODE_CONFIG[mode] || MODE_CONFIG.general;
