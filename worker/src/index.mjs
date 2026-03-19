const DEFAULT_ALLOWED_ORIGIN = "https://vision.blairautomate.co.uk";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_QUESTION_CHARS = 4_000;

class WorkerHttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

const getAllowedOrigin = (env) => env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;

const json = (payload, status, env) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": getAllowedOrigin(env),
      "Content-Type": "application/json",
      Vary: "Origin",
    },
  });

const empty = (status, env) =>
  new Response(null, {
    status,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": getAllowedOrigin(env),
      Vary: "Origin",
    },
  });

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const extractTextFromContent = (content) => {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const parts = content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item.text === "string") {
        return item.text;
      }
      if (item && typeof item.content === "string") {
        return item.content;
      }
      return "";
    })
    .filter(Boolean);

  return parts.join("\n").trim();
};

const extractAnswer = (payload) => {
  if (payload && typeof payload.answer === "string" && payload.answer.trim()) {
    return payload.answer.trim();
  }

  if (payload && typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const messageContent = extractTextFromContent(payload?.message?.content);
  if (messageContent) {
    return messageContent;
  }

  const choiceContent = extractTextFromContent(payload?.choices?.[0]?.message?.content);
  if (choiceContent) {
    return choiceContent;
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of outputItems) {
    const text = extractTextFromContent(item?.content);
    if (text) {
      return text;
    }
  }

  return "";
};

const callUpstream = async (question, env) => {
  if (!env.VLM_API_BASE_URL) {
    throw new WorkerHttpError(500, "VLM_API_BASE_URL is not configured.");
  }

  const headers = {
    "Content-Type": "application/json",
  };
  if (env.VLM_API_KEY) {
    headers.Authorization = `Bearer ${env.VLM_API_KEY}`;
  }

  const upstreamPayload = {
    question,
  };
  if (env.VLM_MODEL_NAME) {
    upstreamPayload.model = env.VLM_MODEL_NAME;
  }

  const timeoutMs = parsePositiveInt(env.REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(env.VLM_API_BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamPayload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new WorkerHttpError(504, "Upstream AI request timed out.");
    }
    throw new WorkerHttpError(502, "Failed to reach upstream AI service.");
  } finally {
    clearTimeout(timeoutId);
  }

  let responsePayload = null;
  try {
    responsePayload = await response.json();
  } catch {
    if (!response.ok) {
      throw new WorkerHttpError(502, `Upstream AI service returned HTTP ${response.status}.`);
    }
    throw new WorkerHttpError(502, "Upstream AI service returned invalid JSON.");
  }

  if (!response.ok) {
    const detail =
      responsePayload?.detail ||
      responsePayload?.error?.message ||
      `Upstream AI service returned HTTP ${response.status}.`;
    throw new WorkerHttpError(502, detail);
  }

  const answer = extractAnswer(responsePayload);
  if (!answer) {
    throw new WorkerHttpError(502, "Upstream AI service returned no answer.");
  }

  return answer;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return empty(204, env);
    }

    if (url.pathname !== "/api/ask") {
      return json({ detail: "Not Found" }, 404, env);
    }

    if (request.method !== "POST") {
      return json({ detail: "Method Not Allowed" }, 405, env);
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return json({ detail: "Invalid JSON payload." }, 400, env);
    }

    const question =
      typeof requestBody?.question === "string" ? requestBody.question.trim() : "";
    if (!question) {
      return json({ detail: "Type a question to ask the assistant." }, 400, env);
    }

    const maxQuestionChars = parsePositiveInt(
      env.MAX_QUESTION_CHARS,
      DEFAULT_MAX_QUESTION_CHARS,
    );
    if (question.length > maxQuestionChars) {
      return json(
        { detail: `Question too long. Max ${maxQuestionChars} characters.` },
        400,
        env,
      );
    }

    try {
      const answer = await callUpstream(question, env);
      return json({ answer }, 200, env);
    } catch (error) {
      if (error instanceof WorkerHttpError) {
        return json({ detail: error.detail }, error.status, env);
      }

      return json({ detail: "Inference failed." }, 500, env);
    }
  },
};
