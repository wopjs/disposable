import { describe, it, expect, vi } from "vitest";
import { makeDisposable } from "../src";

describe("makeDisposable", () => {
  it("should add dispose method to disposer with the value of itself", () => {
    const fn = vi.fn((): void => void 0);
    const disposer = makeDisposable(fn);

    expect(disposer.dispose).toBe(disposer);
    expect(disposer).toBeCalledTimes(0);

    disposer();
    expect(disposer).toBeCalledTimes(1);

    disposer.dispose();
    expect(disposer).toBeCalledTimes(2);
  });
});
