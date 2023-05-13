import { describe, it, expect, vi } from "vitest";
import { abortable } from "../src";
import { isAbortable } from "../src/abortable";

describe("abortable", () => {
  it("should returns a disposer function with dispose method", () => {
    const fn = vi.fn();
    const disposer = abortable(fn);
    expect(typeof disposer).toBe("function");
    expect(typeof disposer.dispose).toBe("function");
    expect(disposer).toBe(disposer.dispose);
    expect(fn).toHaveBeenCalledTimes(0);

    disposer();

    expect(fn).toHaveBeenCalledOnce();
  });

  it("should notify store when disposed", () => {
    const fnDisposer = vi.fn();
    const disposer = abortable(fnDisposer);

    const fnStore = vi.fn();

    expect(isAbortable(disposer)).toBeTruthy();

    if (isAbortable(disposer)) {
      disposer.abortable(fnStore);
    }

    expect(fnDisposer).toHaveBeenCalledTimes(0);
    expect(fnStore).toHaveBeenCalledTimes(0);

    disposer();

    expect(fnDisposer).toHaveBeenCalledOnce();
    expect(fnStore).toHaveBeenCalledOnce();
  });
});
