import { describe, expect, it, vi } from "vitest";

import { abortable, type DisposableDisposer, disposableOne } from "../src";

describe("DisposableOne", () => {
  describe("new", () => {
    it("should create a empty instance", () => {
      const dispose = disposableOne();
      expect(dispose.current).toBeUndefined();
    });

    it("should add an initial disposable", () => {
      const spy = vi.fn();
      const dispose = disposableOne(spy);
      expect(dispose.current).toBe(spy);
      dispose();
      expect(spy).toBeCalledTimes(1);
      expect(dispose.current).toBeUndefined();
    });
  });

  describe("set", () => {
    it("should set a function disposer", () => {
      const dispose = disposableOne();
      const spy = vi.fn();

      const returnedDisposer = dispose.set(spy);

      expect(returnedDisposer).toBe(spy);
      expect(spy).toBeCalledTimes(0);
      expect(dispose.current).toBe(spy);
    });

    it("should set a disposable instance", () => {
      const dispose = disposableOne();
      const disposer = { dispose: vi.fn() };

      const returnedDisposable = dispose.set(disposer);

      expect(returnedDisposable).toBe(disposer);
      expect(disposer.dispose).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);
    });

    it("should invoke disposable instance with correct `this`", () => {
      let self: any;
      const disposer = {
        dispose: vi.fn(function () {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          self = this;
        }),
      };

      disposer.dispose();

      expect(disposer.dispose).toBeCalledTimes(1);
      expect(self).toBe(disposer);

      const dispose = disposableOne();
      dispose.set(disposer);

      expect(disposer.dispose).toBeCalledTimes(1);
      self = null;

      dispose.flush();

      expect(disposer.dispose).toBeCalledTimes(2);
      expect(self).toBe(disposer);
    });

    it("should do nothing if setting the same disposable again", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);

      dispose.dispose();

      expect(disposer).toBeCalledTimes(1);
      expect(dispose.current).toBeUndefined();
    });

    it("should dispose previous disposer when setting null or undefiend", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);

      dispose.set(null);

      expect(disposer).toBeCalledTimes(1);

      disposer.mockClear();

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);

      dispose.set();

      expect(disposer).toBeCalledTimes(1);
    });
  });

  describe("make", () => {
    it("should run executor function and set the returned disposable", () => {
      const dispose = disposableOne();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      dispose.make(() => {
        fnEffect("execute");
        return fnDispose;
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute");
      expect(fnDispose).toBeCalledTimes(0);
      expect(dispose.current).toBe(fnDispose);
    });

    it("should ignore disposer if executor returns null", () => {
      const dispose = disposableOne();

      dispose.make(() => {
        return null;
      });

      expect(dispose.current).toBeUndefined();
    });

    it("should return the disposable", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();

      const returnedDisposer = dispose.make(() => {
        return disposer;
      });

      expect(disposer).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);
      expect(returnedDisposer).toBe(disposer);
    });
  });

  describe("is", () => {
    it("should return `true` if the disposable is the current one", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();
      dispose.set(disposer);

      expect(dispose.is(disposer)).toBe(true);
    });

    it("should return `false` if the disposable is not the current one", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();
      dispose.set(disposer);

      expect(dispose.is(disposer)).toBe(true);
      expect(dispose.is(vi.fn())).toBe(false);
    });
  });

  describe("remove", () => {
    it("should do nothing if empty", () => {
      const dispose = disposableOne();
      expect(dispose.current).toBeUndefined();
      dispose.remove();
      expect(dispose.current).toBeUndefined();
    });

    it("should remove the disposable", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);

      dispose.remove();

      expect(disposer).toBeCalledTimes(0);
      expect(dispose.current).toBeUndefined();
    });

    it("should return true if exists otherwise false", () => {
      const dispose = disposableOne(vi.fn());

      expect(dispose.remove()).toBe(true);
      expect(dispose.remove()).toBe(false);
    });
  });

  describe("flush", () => {
    it("should flush a disposable", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);

      dispose.flush();

      expect(disposer).toBeCalledTimes(1);
      expect(dispose.current).toBeUndefined();
    });

    it("should call `.dispose()` instead if exist", () => {
      const dispose = disposableOne();
      const disposer = vi.fn() as unknown as DisposableDisposer;
      disposer.dispose = vi.fn();

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(disposer.dispose).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);

      dispose.flush();

      expect(disposer).toBeCalledTimes(0);
      expect(disposer.dispose).toBeCalledTimes(1);
      expect(dispose.current).toBeUndefined();
    });

    it("should be able to call flush on a flushed disposable", () => {
      const dispose = disposableOne();
      const disposer = vi.fn();

      dispose.set(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(dispose.current).toBe(disposer);

      dispose.flush();

      expect(disposer).toBeCalledTimes(1);
      expect(dispose.current).toBeUndefined();

      dispose.flush();

      expect(disposer).toBeCalledTimes(1);
      expect(dispose.current).toBeUndefined();
    });

    it("should catch error in disposer", () => {
      const dispose = disposableOne();
      const spy = vi
        .spyOn(globalThis.console, "error")
        .mockImplementation(() => void 0);
      const error = new Error();

      const disposer = dispose.set(() => {
        throw error;
      });

      dispose.set(disposer);

      expect(globalThis.console.error).toBeCalledTimes(0);

      dispose.flush();

      expect(globalThis.console.error).toBeCalledTimes(1);
      expect(globalThis.console.error).toBeCalledWith(error);

      spy.mockRestore();
    });
  });

  describe("dispose", () => {
    it("should flush the current disposable on disposed", () => {
      const dispose = disposableOne();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        dispose.make(() => {
          fnEffect("execute");
          return () => fnDispose(`dispose-${i}`);
        });
      }

      expect(fnEffect).toBeCalledTimes(count);
      expect(fnDispose).toBeCalledTimes(count - 1);
      expect(dispose.current).not.toBeUndefined();

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      dispose.dispose();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(1);
      expect(dispose.current).toBeUndefined();

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      dispose.dispose();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(0);
      expect(dispose.current).toBeUndefined();
    });

    it("should catch error in disposer", () => {
      const dispose = disposableOne();
      const spy = vi
        .spyOn(globalThis.console, "error")
        .mockImplementation(() => void 0);
      const error1 = new Error();
      const error2 = new Error();

      dispose.set(() => {
        throw error1;
      });

      expect(globalThis.console.error).toBeCalledTimes(0);

      dispose.set(() => {
        throw error2;
      });

      expect(globalThis.console.error).toBeCalledTimes(1);
      expect(globalThis.console.error).lastCalledWith(error1);

      dispose.dispose();

      expect(globalThis.console.error).toBeCalledTimes(2);
      expect(globalThis.console.error).lastCalledWith(error2);

      spy.mockRestore();
    });

    it("should be able to call dispose outside of store", () => {
      const dispose = disposableOne();
      const fnDispose = vi.fn();

      dispose.set(fnDispose);
      expect(fnDispose).toHaveBeenCalledTimes(0);

      const disposer = dispose.dispose;
      disposer();
      expect(fnDispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("abortable", () => {
    it("should remove the current abortable when it is disposed", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const dispose = disposableOne();
      dispose.set(disposer);

      expect(dispose.current).toBe(disposer);

      disposer();

      expect(dispose.current).toBeUndefined();
    });

    it("should not rebind abortable when setting again", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const store = disposableOne();

      store.set(disposer);

      store.set(disposer);

      expect(store.current).toBe(disposer);
      expect(fnDispose).toBeCalledTimes(0);

      store.flush();

      expect(store.current).toBeUndefined();
      expect(fnDispose).toBeCalledTimes(1);
    });
  });
});
