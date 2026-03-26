const MODEL_NAME = "@cf/meta/llama-3.2-11b-vision-instruct";
const DEFAULT_ALLOWED_ORIGIN = "https://vision.blairautomate.co.uk";
const DEFAULT_MAX_QUESTION_CHARS = 4_000;

const MODE_PROMPTS = {
  general: [
    "Answer the user's question using the image as your primary evidence.",
    "Describe visible details when they are relevant to the answer.",
    "If something is unclear or not visible, say so plainly instead of guessing.",
  ].join("\n"),
  safety: [
    "Provide a safety-focused review of the image.",
    "Focus on hazards, unsafe behavior, warnings, blocked exits, spills, vehicles, machinery, sharp edges, electrical risks, fire risks, and missing PPE.",
    "Use exactly these sections:",
    "Hazards:",
    "Recommended PPE/actions:",
    "Unknowns:",
    "Use concise bullet points under each section.",
  ].join("\n"),
  slide_summary: [
    "Summarize the visible slide, deck, or document content.",
    "Use exactly these sections:",
    "Title:",
    "Key bullets:",
    "Numbers & trends:",
    "Action items:",
    "Unknowns:",
    "Keep the answer concise and easy to scan.",
    "If the image is not a slide or the text is not readable, say that clearly in Unknowns.",
  ].join("\n"),
};

class WorkerHttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

const getAllowedOrigin = (env) => env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;

const buildHeaders = (env, extraHeaders = {}) => ({
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": getAllowedOrigin(env),
  "Content-Type": "application/json",
  Vary: "Origin",
  ...extraHeaders,
});

const json = (payload, status, env, extraHeaders) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: buildHeaders(env, extraHeaders),
  });

const empty = (status, env, extraHeaders) =>
  new Response(null, {
    status,
    headers: buildHeaders(env, extraHeaders),
  });

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const extractAnswer = (payload) => {
  if (payload && typeof payload.response?.answer === "string" && payload.response.answer.trim()) {
    return payload.response.answer.trim();
  }

  if (payload && typeof payload.result?.response?.answer === "string" && payload.result.response.answer.trim()) {
    return payload.result.response.answer.trim();
  }

  if (payload && typeof payload.response === "string" && payload.response.trim()) {
    return payload.response.trim();
  }

  if (payload && typeof payload.result?.response === "string" && payload.result.response.trim()) {
    return payload.result.response.trim();
  }

  if (payload && typeof payload.answer === "string" && payload.answer.trim()) {
    return payload.answer.trim();
  }

  return "";
};

const validateMode = (mode) => {
  if (typeof mode !== "string") {
    throw new WorkerHttpError(400, "Mode must be one of: general, safety, slide_summary.");
  }

  const normalizedMode = mode.trim();
  if (!Object.hasOwn(MODE_PROMPTS, normalizedMode)) {
    throw new WorkerHttpError(400, "Mode must be one of: general, safety, slide_summary.");
  }

  return normalizedMode;
};

const normalizeImageDataUrl = (image) => {
  if (typeof image !== "string" || !image.trim()) {
    throw new WorkerHttpError(400, "Image must be a base64 data URL string.");
  }

  const trimmed = image.trim();
  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new WorkerHttpError(400, "Image must be a valid base64 data URL.");
  }

  const [, mimeType, rawBase64] = match;
  const base64 = rawBase64.replace(/\s+/g, "");
  try {
    atob(base64);
  } catch {
    throw new WorkerHttpError(400, "Image must be a valid base64 data URL.");
  }

  return `data:${mimeType.toLowerCase()};base64,${base64}`;
};

const buildMessages = (question, mode) => [
  {
    role: "system",
    content: [
      "You are a careful multimodal assistant.",
      "Ground every answer in the supplied image and the user's question.",
      "Do not invent details that are not visible.",
      MODE_PROMPTS[mode],
    ].join("\n\n"),
  },
  {
    role: "user",
    content: `Mode: ${mode}\nQuestion: ${question}`,
  },
];

const callWorkersAi = async ({ question, mode, image }, env) => {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new WorkerHttpError(500, "Workers AI binding is not configured.");
  }

  let responsePayload;
  try {
    responsePayload = await env.AI.run(MODEL_NAME, {
      messages: buildMessages(question, mode),
      image,
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
          },
          required: ["answer"],
          additionalProperties: false,
        },
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? `Workers AI request failed: ${error.message}`
        : "Workers AI request failed.";
    throw new WorkerHttpError(502, detail);
  }

  const answer = extractAnswer(responsePayload);
  if (!answer) {
    throw new WorkerHttpError(502, "Workers AI returned an unexpected response shape.");
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
      return json({ detail: "Method Not Allowed" }, 405, env, {
        Allow: "POST, OPTIONS",
      });
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
      const mode = validateMode(requestBody?.mode);
      const image = normalizeImageDataUrl(requestBody?.image);
      const answer = await callWorkersAi({ question, mode, image }, env);
      return json({ answer }, 200, env);
    } catch (error) {
      if (error instanceof WorkerHttpError) {
        return json({ detail: error.detail }, error.status, env);
      }

      return json({ detail: "Inference failed." }, 500, env);
    }
  },
};
