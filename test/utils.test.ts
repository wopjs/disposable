import { describe, expect, it, vi } from "vitest";

import {
  dispose,
  type Disposer,
  extend,
  type IDisposable,
  isDisposable,
  join,
} from "../src";

describe("dispose", () => {
  it("should call function disposer", () => {
    const fn = vi.fn();

    dispose(fn);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("should call .dispose() on disposable object", () => {
    const disposable = {
      dispose: vi.fn(),
    };

    dispose(disposable);

    expect(disposable.dispose).toHaveBeenCalledOnce();
  });

  it("should prefer .dispose() when both function and .dispose exist", () => {
    const fn = vi.fn() as unknown as Disposer & IDisposable;
    fn.dispose = vi.fn();

    dispose(fn);

    expect(fn).not.toHaveBeenCalled();
    expect(fn.dispose).toHaveBeenCalledOnce();
  });

  it("should catch and log error from disposer", () => {
    const error = new Error("dispose error");
    const logSpy = vi
      .spyOn(globalThis.console, "error")
      .mockImplementation(() => void 0);

    dispose(() => {
      throw error;
    });

    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith(error);

    logSpy.mockRestore();
  });

  it("should do nothing for non-disposable values", () => {
    const logSpy = vi
      .spyOn(globalThis.console, "error")
      .mockImplementation(() => void 0);

    dispose(undefined);
    dispose(null);
    dispose(0);
    dispose(false);
    dispose("text");
    dispose({});

    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });
});

describe("isDisposable", () => {
  it("should returns true for Disposer", () => {
    const a = () => void 0;
    const b: Disposer = () => void 0;
    expect(isDisposable(a)).toBe(true);
    expect(isDisposable(b)).toBe(true);
  });

  it("should returns true for IDisposable", () => {
    const a = { dispose() {} };
    const b: IDisposable = { dispose: () => {} };
    expect(isDisposable(a)).toBe(true);
    expect(isDisposable(b)).toBe(true);
  });

  it("should returns false for other types", () => {
    const a = {};
    const b = 2;
    const c = "str";
    expect(isDisposable(a)).toBe(false);
    expect(isDisposable(b)).toBe(false);
    expect(isDisposable(c)).toBe(false);
  });
});

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

describe("extend", () => {
  it("should extend dispose method", () => {
    const spy = vi.fn();
    const disposable: IDisposable = {
      dispose: spy,
    };

    const spy1 = vi.fn();
    const spy2 = vi.fn();
    extend(disposable, spy1, spy2);

    expect(spy).not.toHaveBeenCalled();
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();

    disposable.dispose();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
  });
});
