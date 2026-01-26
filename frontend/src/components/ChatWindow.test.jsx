import { render } from "@testing-library/react";
import { vi } from "vitest";
import ChatWindow from "./ChatWindow";

describe("ChatWindow", () => {
  it("auto scrolls when messages change", () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollTo = scrollSpy;
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    render(<ChatWindow messages={messages} isLoading={false} />);
    expect(scrollSpy).toHaveBeenCalled();
  });
});
