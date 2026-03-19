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

  it("posts question JSON to the worker ask endpoint", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ answer: "ok" }),
    });

    await askQuestion({ question: "Hello worker" });

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "Hello worker",
      }),
    });
  });
});
