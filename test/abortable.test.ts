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

  it("should support IDisposable as param", () => {
    const d = { dispose: vi.fn() };
    const disposer = abortable(d);
    expect(typeof disposer).toBe("function");
    expect(typeof disposer.dispose).toBe("function");
    expect(disposer).toBe(disposer.dispose);
    expect(d.dispose).toHaveBeenCalledTimes(0);

    disposer();

    expect(d.dispose).toHaveBeenCalledOnce();
  });

  it("should notify store when disposed", () => {
    const fnDisposer = vi.fn();
    const disposer = abortable(fnDisposer);

    const fnOnDispose = vi.fn();

    expect(isAbortable(disposer)).toBeTruthy();

    if (isAbortable(disposer)) {
      disposer.abortable(fnOnDispose);
    }

    expect(fnDisposer).toHaveBeenCalledTimes(0);
    expect(fnOnDispose).toHaveBeenCalledTimes(0);

    disposer();

    expect(fnDisposer).toHaveBeenCalledOnce();
    expect(fnOnDispose).toHaveBeenCalledOnce();
  });

  it("should remove previous bound store before binding new one", () => {
    const fnDisposer = vi.fn();
    const disposer = abortable(fnDisposer);

    const onDispose1 = vi.fn();
    const onDispose2 = vi.fn();

    expect(isAbortable(disposer)).toBeTruthy();

    if (isAbortable(disposer)) {
      disposer.abortable(onDispose1);
    }

    expect(fnDisposer).toHaveBeenCalledTimes(0);
    expect(onDispose1).toHaveBeenCalledTimes(0);
    expect(onDispose2).toHaveBeenCalledTimes(0);

    if (isAbortable(disposer)) {
      disposer.abortable(onDispose2);
    }

    expect(fnDisposer).toHaveBeenCalledTimes(0);
    expect(onDispose1).toHaveBeenCalledTimes(1);
    expect(onDispose2).toHaveBeenCalledTimes(0);
  });

  it("should catch error in abortable disposer", () => {
    const fnDisposer = vi.fn();
    const disposer = abortable(fnDisposer);

    const spy = vi
      .spyOn(globalThis.console, "error")
      .mockImplementation(() => void 0);

    const error = new Error();
    const fnOnDispose = vi.fn(() => {
      throw error;
    });

    expect(isAbortable(disposer)).toBeTruthy();

    if (isAbortable(disposer)) {
      disposer.abortable(fnOnDispose);
    }

    expect(fnDisposer).toHaveBeenCalledTimes(0);
    expect(fnOnDispose).toHaveBeenCalledTimes(0);

    disposer();

    expect(fnDisposer).toHaveBeenCalledOnce();
    expect(fnOnDispose).toHaveBeenCalledOnce();

    expect(globalThis.console.error).toBeCalledTimes(1);
    expect(globalThis.console.error).toBeCalledWith(error);

    spy.mockRestore();
  });
});
