import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ModeSelector from "./ModeSelector";

describe("ModeSelector", () => {
  it("calls onChange when mode changes", () => {
    const handleChange = vi.fn();
    render(<ModeSelector mode="general" onChange={handleChange} disabled={false} />);
    const button = screen.getByText(/Safety/i);
    fireEvent.click(button);
    expect(handleChange).toHaveBeenCalledWith("safety");
  });
});
