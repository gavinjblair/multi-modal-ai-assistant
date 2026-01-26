const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function askQuestion({ imageFile, question, mode, sessionId, backend }) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("question", question);
  formData.append("mode", mode || "general");
  if (sessionId) {
    formData.append("session_id", sessionId);
  }
  if (backend) {
    formData.append("backend", backend);
  }

  try {
    const response = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      body: formData,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body.detail || "Request failed.";
      const isModelBackendError =
        response.status === 502 && /model backend error/i.test(detail);
      const friendlyMessage = isModelBackendError
        ? "Model is loading. Please wait 1–2 minutes and try again."
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
