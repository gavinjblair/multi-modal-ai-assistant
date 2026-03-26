import { API_BASE_URL } from "./config";

const modeMap = {
  general: "general",
  safety: "safety",
  slides: "slide_summary",
  slide_summary: "slide_summary",
};

export async function askQuestion({ question, mode, image }) {
  const normalizedMode = typeof mode === "string" ? mode.toLowerCase() : "";
  const apiMode = modeMap[normalizedMode] || "general";

  try {
    const response = await fetch(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        mode: apiMode,
        image,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body.detail || "Request failed.";
      return { ok: false, error: detail };
    }
    return { ok: true, data: body };
  } catch (err) {
    return { ok: false, error: err.message || "Network error" };
  }
}
