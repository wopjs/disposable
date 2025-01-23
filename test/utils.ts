import { describe, expect, it } from "vitest";

import { type Disposer, type IDisposable, isDisposable } from "../src";

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
    const b = () => {};
    expect(isDisposable(a)).toBe(false);
    expect(isDisposable(b)).toBe(false);
  });
});
