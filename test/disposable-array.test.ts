import { describe, expect, it, vi } from "vitest";

import { abortable, disposableArray, type IDisposable } from "../src";

describe("DisposableArray", () => {
  describe("new", () => {
    it("should create an empty array", () => {
      const arr = disposableArray();
      expect(arr.size()).toBe(0);
    });

    it("should push initial disposables", () => {
      const disposers = Array(5)
        .fill(0)
        .map(() => vi.fn());
      const arr = disposableArray(disposers);
      expect(arr.size()).toBe(disposers.length);
    });
  });

  describe("push", () => {
    it("should push a function disposer", () => {
      const arr = disposableArray();
      const disposer = vi.fn();

      const returnedDisposer = arr.push(disposer);

      expect(returnedDisposer).toBe(disposer);
      expect(disposer).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(1);
    });

    it("should push a disposable instance", () => {
      const arr = disposableArray();
      const disposer = { dispose: vi.fn() };

      const returnedDisposable = arr.push(disposer);

      expect(returnedDisposable).toBe(disposer);
      expect(disposer.dispose).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(1);
    });

    it("should invoke disposable instance with correct `this`", () => {
      let self: any;
      const disposer = {
        dispose: vi.fn(function (this: IDisposable) {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          self = this;
        }),
      };

      disposer.dispose();

      expect(disposer.dispose).toHaveBeenCalledTimes(1);
      expect(self).toBe(disposer);

      const arr = disposableArray();
      arr.push(disposer);

      expect(disposer.dispose).toHaveBeenCalledTimes(1);
      self = null;

      arr.flush();

      expect(disposer.dispose).toHaveBeenCalledTimes(2);
      expect(self).toBe(disposer);
    });

    it("should allow duplicated disposables", () => {
      const arr = disposableArray();
      const disposer = vi.fn();

      arr.push(disposer);
      arr.push(disposer);

      expect(arr.size()).toBe(2);

      arr.flush();
      expect(disposer).toHaveBeenCalledTimes(2);
      expect(arr.size()).toBe(0);
    });

    it("should push an array of disposables", () => {
      const arr = disposableArray();
      const disposers = Array.from({ length: 5 }).map(() => vi.fn());

      const returnedValue = arr.push(disposers);

      expect(returnedValue).toBe(disposers);
      disposers.forEach((disposer) => {
        expect(disposer).toHaveBeenCalledTimes(0);
      });
      expect(arr.size()).toBe(5);
    });
  });

  describe("make", () => {
    it("should run executor and push returned disposable", () => {
      const arr = disposableArray();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      arr.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toHaveBeenCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute");
      expect(fnDispose).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(1);
    });

    it("should ignore disposer if executor returns null", () => {
      const arr = disposableArray();

      arr.make(() => null);

      expect(arr.size()).toBe(0);
    });

    it("should push an array returned from executor", () => {
      const arr = disposableArray();
      const fnEffect = vi.fn();
      const disposer1 = vi.fn();
      const disposer2 = vi.fn();

      arr.make(() => {
        fnEffect("execute");
        return [disposer1, disposer2];
      });

      expect(fnEffect).toHaveBeenCalledTimes(1);
      expect(disposer1).toHaveBeenCalledTimes(0);
      expect(disposer2).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(2);
    });
  });

  describe("has", () => {
    it("should return false when array is empty", () => {
      const arr = disposableArray();
      const d1 = () => void 0;

      expect(arr.has(d1)).toBe(false);
    });

    it("should return true if disposable exists", () => {
      const arr = disposableArray();
      const d1 = vi.fn();
      const d2 = vi.fn();
      arr.push(d1);
      arr.push(d2);

      expect(arr.has(d1)).toBe(true);
      expect(arr.has(d2)).toBe(true);
    });

    it("should return false if disposable does not exist", () => {
      const arr = disposableArray();
      const d1 = vi.fn();
      const d2 = () => void 0;
      arr.push(d1);

      expect(arr.has(d1)).toBe(true);
      expect(arr.has(d2)).toBe(false);
    });
  });

  describe("remove", () => {
    it("should return false when removing from empty array", () => {
      const arr = disposableArray();
      const disposer = () => void 0;

      expect(arr.remove(disposer)).toBe(false);
      expect(arr.size()).toBe(0);
    });

    it("should remove one disposable without flushing", () => {
      const arr = disposableArray();
      const disposer = vi.fn();

      arr.push(disposer);

      expect(arr.size()).toBe(1);
      expect(disposer).toHaveBeenCalledTimes(0);

      arr.remove(disposer);

      expect(arr.size()).toBe(0);
      expect(disposer).toHaveBeenCalledTimes(0);
    });

    it("should return true if removed otherwise false", () => {
      const arr = disposableArray();
      const disposer = vi.fn();
      arr.push(disposer);

      expect(arr.remove(disposer)).toBe(true);
      expect(arr.remove(disposer)).toBe(false);
    });

    it("should remove the latest duplicate first", () => {
      const arr = disposableArray();
      const first = vi.fn();
      const duplicated = vi.fn();
      const last = vi.fn();

      arr.push([first, duplicated, duplicated, last]);

      expect(arr.size()).toBe(4);
      expect(arr.remove(duplicated)).toBe(true);
      expect(arr.size()).toBe(3);

      arr.flush();

      expect(first).toHaveBeenCalledTimes(1);
      expect(duplicated).toHaveBeenCalledTimes(1);
      expect(last).toHaveBeenCalledTimes(1);
    });
  });

  describe("flush", () => {
    it("should flush one disposable", () => {
      const arr = disposableArray();
      const disposer = vi.fn();

      arr.push(disposer);

      expect(disposer).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(1);

      arr.flush(disposer);

      expect(disposer).toHaveBeenCalledTimes(1);
      expect(arr.size()).toBe(0);
    });

    it("should flush all if no disposable is provided", () => {
      const arr = disposableArray();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        arr.make(() => {
          fnEffect("execute");
          return () => fnDispose(`dispose-${i}`);
        });
      }

      expect(fnEffect).toHaveBeenCalledTimes(count);
      expect(fnDispose).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(count);

      arr.flush();

      expect(fnDispose).toHaveBeenCalledTimes(count);
      expect(arr.size()).toBe(0);
    });

    it("should do nothing when flushing a non-existing disposable", () => {
      const arr = disposableArray();
      const target = vi.fn();
      const another = vi.fn();

      arr.push(target);
      expect(arr.size()).toBe(1);

      arr.flush(another);

      expect(target).toHaveBeenCalledTimes(0);
      expect(another).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(1);
    });
  });

  describe("dispose", () => {
    it("should flush all on dispose", () => {
      const arr = disposableArray();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        arr.push(() => fnDispose(i));
      }

      expect(fnDispose).toHaveBeenCalledTimes(0);
      expect(arr.size()).toBe(count);

      arr.dispose();

      expect(fnDispose).toHaveBeenCalledTimes(count);
      expect(arr.size()).toBe(0);

      arr.dispose();

      expect(fnDispose).toHaveBeenCalledTimes(count);
      expect(arr.size()).toBe(0);
    });

    it("should be able to call dispose outside", () => {
      const arr = disposableArray();
      const fnDispose = vi.fn();

      arr.push(fnDispose);

      const dispose = arr.dispose;
      dispose();

      expect(fnDispose).toHaveBeenCalledTimes(1);
      expect(arr.size()).toBe(0);
    });
  });

  describe("abortable", () => {
    it("should remove from array if an abortable is self-disposed", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const arr = disposableArray();
      arr.push(disposer);

      expect(arr.size()).toBe(1);

      disposer();

      expect(arr.size()).toBe(0);
      expect(fnDispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("nesting", () => {
    it("should be composable with other disposables", () => {
      const spyA = vi.fn();
      const spyB = vi.fn();

      class A implements IDisposable {
        public readonly dispose = disposableArray();
        public constructor() {
          this.dispose.push(spyA);
        }
      }

      class B implements IDisposable {
        public readonly dispose = disposableArray();
        public readonly a = this.dispose.push(new A());
        public constructor() {
          this.dispose.push(spyB);
        }
      }

      const b = new B();

      expect(spyA).toHaveBeenCalledTimes(0);
      expect(spyB).toHaveBeenCalledTimes(0);

      b.dispose();

      expect(spyA).toHaveBeenCalledTimes(1);
      expect(spyB).toHaveBeenCalledTimes(1);
      expect(b.dispose.size()).toBe(0);
    });

    it("should prevent cycle", () => {
      const a = disposableArray();
      const b = disposableArray();
      const c = disposableArray();
      const d = disposableArray();

      a.push(b);
      b.push(c);
      c.push(d);
      d.push(a);

      a.dispose();

      expect(a.size()).toBe(0);
      expect(b.size()).toBe(0);
      expect(c.size()).toBe(0);
      expect(d.size()).toBe(0);
    });
  });
});
