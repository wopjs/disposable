import { describe, expect, it, vi } from "vitest";

import {
  abortable,
  type DisposableDisposer,
  disposableStore,
  type IDisposable,
} from "../src";

describe("DisposableStore", () => {
  describe("new", () => {
    it("should create a empty store", () => {
      const store = disposableStore();
      expect(store.size()).toBe(0);
    });

    it("should add an array of initial disposables", () => {
      const disposers = Array(5)
        .fill(0)
        .map(() => vi.fn());
      const store = disposableStore(disposers);
      expect(store.size()).toBe(disposers.length);
    });
  });

  describe("add", () => {
    it("should add a function disposer to the store", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      const returnedDisposer = store.add(disposer);

      expect(returnedDisposer).toBe(disposer);
      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
    });

    it("should add a disposable instance to the store", () => {
      const store = disposableStore();
      const disposer = { dispose: vi.fn() };

      const returnedDisposable = store.add(disposer);

      expect(returnedDisposable).toBe(disposer);
      expect(disposer.dispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
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

      const store = disposableStore();
      store.add(disposer);

      expect(disposer.dispose).toBeCalledTimes(1);
      self = null;

      store.flush();

      expect(disposer.dispose).toBeCalledTimes(2);
      expect(self).toBe(disposer);
    });

    it("should add two disposers", () => {
      const store = disposableStore();
      const disposer1 = vi.fn();
      const disposer2 = vi.fn();

      store.add(disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.add(disposer2);

      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(2);
    });

    it("should do nothing if adding the same disposable again", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.dispose();

      expect(disposer).toBeCalledTimes(1);
      expect(store.size()).toBe(0);
    });

    it("should add a list of disposers", () => {
      const store = disposableStore();
      const disposers = Array.from({ length: 5 }).map(() => vi.fn());

      const returnedValue = store.add(disposers);

      expect(returnedValue).toBe(disposers);

      disposers.forEach(disposer => {
        expect(disposer).toBeCalledTimes(0);
      });
      expect(store.size()).toBe(5);
    });
  });

  describe("make", () => {
    it("should run executor function and add the returned disposable to the store", () => {
      const store = disposableStore();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      store.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute");
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
    });

    it("should make two disposables to the store", () => {
      const store = disposableStore();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      store.make(() => {
        fnEffect("execute1");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute1");
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.make(() => {
        fnEffect("execute2");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnEffect).lastCalledWith("execute2");
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(2);
    });

    it("should ignore disposer if executor returns null", () => {
      const store = disposableStore();

      store.make(() => {
        return null;
      });

      expect(store.size()).toBe(0);
    });

    it("should return the disposable", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      const returnedDisposer = store.make(() => {
        return disposer;
      });

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
      expect(returnedDisposer).toBe(disposer);
    });

    it("should add an array of disposers returned from executor", () => {
      const store = disposableStore();
      const fnEffect = vi.fn();
      const disposer1 = vi.fn();
      const disposer2 = vi.fn();

      store.make(() => {
        fnEffect("execute1");
        return [disposer1, disposer2];
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute1");
      expect(disposer1).toBeCalledTimes(0);
      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(2);

      const disposer3 = vi.fn();
      const disposer4 = vi.fn();

      store.make(() => {
        fnEffect("execute2");
        return [disposer3, disposer4];
      });

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnEffect).lastCalledWith("execute2");
      expect(disposer1).toBeCalledTimes(0);
      expect(disposer2).toBeCalledTimes(0);
      expect(disposer3).toBeCalledTimes(0);
      expect(disposer4).toBeCalledTimes(0);
      expect(store.size()).toBe(4);

      store.make(() => {
        fnEffect("execute3");
        return [disposer1, disposer3];
      });

      expect(fnEffect).toBeCalledTimes(3);
      expect(fnEffect).lastCalledWith("execute3");
      expect(disposer1).toBeCalledTimes(0);
      expect(disposer2).toBeCalledTimes(0);
      expect(disposer3).toBeCalledTimes(0);
      expect(disposer4).toBeCalledTimes(0);
      expect(store.size()).toBe(4);
    });
  });

  describe("has", () => {
    it("should return `true` if the disposable is in the store", () => {
      const store = disposableStore();
      const d1 = vi.fn();
      const d2 = vi.fn();
      store.add(d1);
      store.add(d2);

      expect(store.has(d1)).toBe(true);
      expect(store.has(d2)).toBe(true);
    });

    it("should return `false` if the disposable is not in the store", () => {
      const store = disposableStore();
      const d1 = vi.fn();
      const d2 = vi.fn();
      store.add(d1);
      store.add(d2);

      expect(store.has(d1)).toBe(true);
      expect(store.has(d2)).toBe(true);
      expect(store.has(vi.fn())).toBe(false);
      expect(store.has(vi.fn())).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove a disposable", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should be able to call remove on a removed disposable", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(0);

      store.remove(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should remove two disposers", () => {
      const store = disposableStore();
      const disposer1 = vi.fn();

      store.add(disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      const disposer2 = vi.fn();

      store.add(disposer2);

      expect(disposer1).toBeCalledTimes(0);
      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(2);

      store.remove(disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove(disposer2);

      expect(disposer1).toBeCalledTimes(0);
      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should return true if exists otherwise false", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      store.add(disposer);

      expect(store.remove(disposer)).toBe(true);
      expect(store.remove(disposer)).toBe(false);
    });
  });

  describe("flush", () => {
    it("should flush a disposable", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.flush(disposer);

      expect(disposer).toBeCalledTimes(1);
      expect(store.size()).toBe(0);
    });

    it("should call `.dispose()` instead if exist", () => {
      const store = disposableStore();
      const disposer = vi.fn() as unknown as DisposableDisposer;
      disposer.dispose = vi.fn();

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(disposer.dispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.flush(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(disposer.dispose).toBeCalledTimes(1);
      expect(store.size()).toBe(0);
    });

    it("should be able to call flush on a flushed disposable", () => {
      const store = disposableStore();
      const disposer = vi.fn();

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.flush(disposer);

      expect(disposer).toBeCalledTimes(1);
      expect(store.size()).toBe(0);

      store.flush(disposer);

      expect(disposer).toBeCalledTimes(1);
      expect(store.size()).toBe(0);
    });

    it("should flush two disposers", () => {
      const store = disposableStore();
      const disposer1 = vi.fn();

      store.add(disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      const disposer2 = vi.fn();

      store.add(disposer2);

      expect(disposer1).toBeCalledTimes(0);
      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(2);

      store.flush(disposer1);

      expect(disposer1).toBeCalledTimes(1);
      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.flush(disposer2);

      expect(disposer1).toBeCalledTimes(1);
      expect(disposer2).toBeCalledTimes(1);
      expect(store.size()).toBe(0);
    });

    it("should catch error in disposer", () => {
      const store = disposableStore();
      const spy = vi
        .spyOn(globalThis.console, "error")
        .mockImplementation(() => void 0);
      const error = new Error();

      const disposer = store.add(() => {
        throw error;
      });

      expect(globalThis.console.error).toBeCalledTimes(0);

      store.flush(disposer);

      expect(globalThis.console.error).toBeCalledTimes(1);
      expect(globalThis.console.error).toBeCalledWith(error);

      spy.mockRestore();
    });

    it("should flush all disposables if no key is provided", () => {
      const store = disposableStore();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        store.make(() => {
          fnEffect("execute");
          return () => fnDispose(`dispose-${i}`);
        });
      }

      expect(fnEffect).toBeCalledTimes(count);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(count);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      store.flush();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(count);
      expect(store.size()).toBe(0);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      store.flush();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });
  });

  describe("dispose", () => {
    it("should flush all disposables on disposed", () => {
      const store = disposableStore();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        store.make(() => {
          fnEffect("execute");
          return () => fnDispose(`dispose-${i}`);
        });
      }

      expect(fnEffect).toBeCalledTimes(count);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(count);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      store.dispose();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(count);
      expect(store.size()).toBe(0);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      store.dispose();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should catch error in disposer", () => {
      const store = disposableStore();
      const spy = vi
        .spyOn(globalThis.console, "error")
        .mockImplementation(() => void 0);
      const error1 = new Error();
      const error2 = new Error();

      store.add(() => {
        throw error1;
      });

      store.add(() => {
        throw error2;
      });

      expect(globalThis.console.error).toBeCalledTimes(0);

      store.dispose();

      expect(globalThis.console.error).toBeCalledTimes(2);
      expect(globalThis.console.error).toBeCalledWith(error1);
      expect(globalThis.console.error).toBeCalledWith(error2);

      spy.mockRestore();
    });

    it("should be able to call dispose outside of store", () => {
      const store = disposableStore();
      const fnDispose = vi.fn();

      store.add(fnDispose);
      expect(fnDispose).toHaveBeenCalledTimes(0);

      const dispose = store.dispose;
      dispose();
      expect(fnDispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("abortable", () => {
    it("should remove from store if an abortable is disposed", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const store = disposableStore();
      store.add(disposer);

      expect(store.size()).toBe(1);

      disposer();

      expect(store.size()).toBe(0);
    });

    it("should not rebind abortable to the store when added again", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const store = disposableStore();

      store.add(disposer);

      store.add(disposer);

      expect(store.size()).toBe(1);
      expect(fnDispose).toBeCalledTimes(0);

      store.flush(disposer);

      expect(store.size()).toBe(0);
      expect(fnDispose).toBeCalledTimes(1);
    });
  });

  describe("nesting", () => {
    it("should be able to combine disposables", () => {
      const spyA = vi.fn();
      const spyB = vi.fn();

      class A implements IDisposable {
        public readonly dispose = disposableStore();
        public print = vi.fn();
        public constructor() {
          this.dispose.add(spyA);
        }
      }

      class B implements IDisposable {
        public readonly dispose = disposableStore();
        public a = this.dispose.add(new A());
        public constructor() {
          this.dispose.add(spyB);
        }
      }

      const b = new B();

      expect(spyA).toBeCalledTimes(0);
      expect(spyB).toBeCalledTimes(0);
      expect(b.a.print).toBeCalledTimes(0);

      b.a.print("hello");
      expect(b.a.print).toBeCalledTimes(1);
      expect(b.a.print).toBeCalledWith("hello");

      b.dispose();

      expect(spyA).toBeCalledTimes(1);
      expect(spyB).toBeCalledTimes(1);
    });
  });

  it("should prevent cycle", () => {
    const a = disposableStore();
    const b = disposableStore();
    const c = disposableStore();
    const d = disposableStore();

    a.add(b);
    b.add(c);
    c.add(d);
    d.add(a);

    a.dispose();
    expect(a._disposables_?.size).toBe(0);
    expect(b._disposables_?.size).toBe(0);
    expect(c._disposables_?.size).toBe(0);
    expect(d._disposables_?.size).toBe(0);
  });
});
