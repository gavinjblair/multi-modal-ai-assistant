import { API_BASE_URL } from "./config";

export async function askQuestion({ question }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body.detail || "Request failed.";
      const isModelBackendError =
        response.status === 502 && /model backend error/i.test(detail);
      const friendlyMessage = isModelBackendError
        ? "Model is loading. Please wait 1-2 minutes and try again."
        : detail;
      return { ok: false, error: friendlyMessage };
    }

    const backendMode = body.backendMode || body.backend_mode;
    const fallbackReason = body.fallbackReason || body.fallback_reason;
    return { ok: true, data: { ...body, backendMode, fallbackReason } };
  } catch (err) {
    return { ok: false, error: err.message || "Network error" };
  }
}
