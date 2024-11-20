import { describe, it, expect, vi } from "vitest";

import { join } from "../src";

describe("join", () => {
  it("should returns a disposer function", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const disposer = join(fn1, fn2);
    expect(typeof disposer).toBe("function");
    expect(fn1).toHaveBeenCalledTimes(0);
    expect(fn2).toHaveBeenCalledTimes(0);

    disposer();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
