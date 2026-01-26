import "@testing-library/jest-dom";
import { vi } from "vitest";

if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = vi.fn(() => "blob:mock");
}

if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = vi.fn();
}

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}
