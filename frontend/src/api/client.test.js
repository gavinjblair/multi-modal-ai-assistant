import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askQuestion } from "./client";
import { API_BASE_URL } from "./config";

describe("askQuestion", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends general mode as general", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ answer: "ok" }),
    });

    await askQuestion({
      question: "Hello worker",
      mode: "general",
      image: "data:image/png;base64,ZmFrZQ==",
    });

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "Hello worker",
        mode: "general",
        image: "data:image/png;base64,ZmFrZQ==",
      }),
    });
  });

  it("sends safety mode as safety", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ answer: "ok" }),
    });

    await askQuestion({
      question: "Hello worker",
      mode: "safety",
      image: "data:image/png;base64,ZmFrZQ==",
    });

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "Hello worker",
        mode: "safety",
        image: "data:image/png;base64,ZmFrZQ==",
      }),
    });
  });

  it("maps slides mode to slide_summary", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ answer: "ok" }),
    });

    await askQuestion({
      question: "Hello worker",
      mode: "slides",
      image: "data:image/png;base64,ZmFrZQ==",
    });

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "Hello worker",
        mode: "slide_summary",
        image: "data:image/png;base64,ZmFrZQ==",
      }),
    });
  });
});
