import type { DisposableDisposer, IDisposable } from "../src";

import { describe, expect, it, vi } from "vitest";

import { abortable, disposableMap } from "../src";

describe("DisposableMap", () => {
  describe("new", () => {
    it("should create a empty map", () => {
      const map = disposableMap();
      expect(map.size()).toBe(0);
    });
  });

  describe("set", () => {
    it("should set a function disposer to the map", () => {
      const map = disposableMap();
      const disposer = vi.fn();

      const returnedDisposer = map.set("key1", disposer);

      expect(returnedDisposer).toBe(disposer);
      expect(disposer).toBeCalledTimes(0);
      expect(map.size()).toBe(1);
    });

    it("should set a disposable instance to the map", () => {
      const map = disposableMap();
      const disposer = { dispose: vi.fn() };

      const returnedDisposable = map.set("key1", disposer);

      expect(returnedDisposable).toBe(disposer);
      expect(disposer.dispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);
    });

    it("should add two disposers", () => {
      const map = disposableMap();
      const disposer1 = vi.fn();
      const disposer2 = vi.fn();

      map.set("key1", disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.set("key2", disposer2);

      expect(disposer2).toBeCalledTimes(0);
      expect(map.size()).toBe(2);
    });

    it("should flush previous disposable when setting a new disposable with the same key", () => {
      const map = disposableMap();
      const disposer1 = vi.fn();

      map.set("key1", disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      const disposer2 = vi.fn();
      map.set("key1", disposer2);

      expect(disposer1).toBeCalledTimes(1);
      expect(disposer2).toBeCalledTimes(0);
      expect(map.size()).toBe(1);
    });
  });

  describe("make", () => {
    it("should run executor function and set the returned disposable to the map", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("key1", () => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute");
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);
    });

    it("should make two disposables to the map", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("key1", () => {
        fnEffect("execute1");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute1");
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.make("key2", () => {
        fnEffect("execute2");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnEffect).lastCalledWith("execute2");
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(2);
    });

    it("should ignore disposer if executor returns null", () => {
      const map = disposableMap();

      map.make("key1", () => {
        return null;
      });

      expect(map.size()).toBe(0);
    });

    it("should return the disposable", () => {
      const map = disposableMap();
      const disposer = vi.fn();

      const returnedDisposer = map.make("key1", () => {
        return disposer;
      });

      expect(disposer).toBeCalledTimes(0);
      expect(map.size()).toBe(1);
      expect(returnedDisposer).toBe(disposer);
    });

    it("should flush effect with same key when making a new disposable", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("key1", () => {
        fnEffect("execute1");
        return () => fnDispose("dispose1");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute1");
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      fnEffect.mockReset();
      fnDispose.mockReset();

      map.make("key1", () => {
        fnEffect("execute2");
        return () => fnDispose("dispose2");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute2");
      expect(fnDispose).toBeCalledTimes(1);
      expect(fnDispose).lastCalledWith("dispose1");
      expect(map.size()).toBe(1);
    });
  });

  describe("keys", () => {
    it("should return an iterator of keys", () => {
      const map = disposableMap();
      const d1 = vi.fn();
      const d2 = vi.fn();
      map.set("key1", d1);
      map.set("key2", d2);

      const keys = map.keys();
      expect(keys.next().value).toBe("key1");
      expect(keys.next().value).toBe("key2");
      expect(keys.next().done).toBe(true);
    });

    it("should return an iterator of keys if empty", () => {
      const map = disposableMap();
      const keys = map.keys();
      expect(keys.next().done).toBe(true);
    });
  });

  describe("has", () => {
    it("should return `true` if the disposable is in the store", () => {
      const map = disposableMap();
      const d1 = vi.fn();
      const d2 = vi.fn();
      map.set("key1", d1);
      map.set("key2", d2);

      expect(map.has("key1")).toBe(true);
      expect(map.has("key2")).toBe(true);
    });

    it("should return `false` if the disposable is not in the store", () => {
      const map = disposableMap();
      const d1 = vi.fn();
      const d2 = vi.fn();
      map.set("key1", d1);
      map.set("key2", d2);

      expect(map.has("key1")).toBe(true);
      expect(map.has("key2")).toBe(true);
      expect(map.has("key3")).toBe(false);
      expect(map.has("key4")).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove a disposable by key", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("a-key", () => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.remove("a-key");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(0);
    });

    it("should be able to call remove on a removed key", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("a-key", () => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.remove("a-key");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(0);

      map.remove("a-key");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(0);
    });

    it("should remove two disposers", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("disposer1", () => {
        fnEffect("execute1");
        return () => fnDispose("dispose1");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute1");
      expect(map.size()).toBe(1);

      map.make("disposer2", () => {
        fnEffect("execute2");
        return () => fnDispose("dispose2");
      });

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute2");
      expect(map.size()).toBe(2);

      map.remove("disposer1");

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.remove("disposer2");

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(0);
    });

    it("should return the disposable if exists otherwise undefined", () => {
      const map = disposableMap();
      const fnDispose = vi.fn();

      const disposer = map.set("disposer", () => fnDispose);

      expect(map.remove("disposer")).toBe(disposer);
      expect(map.remove("disposer")).toBeUndefined();
    });
  });

  describe("flush", () => {
    it("should flush a disposable by key", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("key1", () => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.flush("key1");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(1);
      expect(map.size()).toBe(0);
    });

    it("should call `.dispose()` instead if exist", () => {
      const map = disposableMap();
      const disposer = vi.fn() as unknown as DisposableDisposer;
      disposer.dispose = vi.fn();

      map.set("key1", disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(disposer.dispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.flush("key1");

      expect(disposer).toBeCalledTimes(0);
      expect(disposer.dispose).toBeCalledTimes(1);
      expect(map.size()).toBe(0);
    });

    it("should be able to call flush on a flushed disposable", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("aKey", () => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(1);

      map.flush("aKey");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(1);
      expect(map.size()).toBe(0);

      map.flush("aKey");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(1);
      expect(map.size()).toBe(0);
    });

    it("should flush two disposers by key", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      map.make("disposer1", () => {
        fnEffect("execute1");
        return () => fnDispose("dispose1");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute1");
      expect(map.size()).toBe(1);

      map.make("disposer2", () => {
        fnEffect("execute2");
        return () => fnDispose("dispose2");
      });

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute2");
      expect(map.size()).toBe(2);

      map.flush("disposer1");

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(1);
      expect(map.size()).toBe(1);

      map.flush("disposer2");

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(2);
      expect(map.size()).toBe(0);
    });

    it("should catch error in disposer", () => {
      const map = disposableMap();
      const spy = vi
        .spyOn(globalThis.console, "error")
        .mockImplementation(() => void 0);
      const error = new Error();

      map.set("disposer", () => {
        throw error;
      });

      expect(globalThis.console.error).toBeCalledTimes(0);

      map.flush("disposer");

      expect(globalThis.console.error).toBeCalledTimes(1);
      expect(globalThis.console.error).toBeCalledWith(error);

      spy.mockRestore();
    });

    it("should flush all disposables if no key is provided", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        map.make(i, () => {
          fnEffect("execute");
          return () => fnDispose(`dispose-${i}`);
        });
      }

      expect(fnEffect).toBeCalledTimes(count);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(count);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      map.flush();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(count);
      expect(map.size()).toBe(0);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      map.flush();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(0);
    });

    it("should not flush all if key is 0", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        map.make(i, () => {
          fnEffect("execute");
          return () => fnDispose(`dispose-${i}`);
        });
      }

      expect(fnEffect).toBeCalledTimes(count);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(count);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      map.flush(0);

      expect(map.size()).toBe(count - 1);
    });
  });

  describe("dispose", () => {
    it("should flush all disposables on disposed", () => {
      const map = disposableMap();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();
      const count = 100;

      for (let i = 0; i < count; i++) {
        map.make(i, () => {
          fnEffect("execute");
          return () => fnDispose(`dispose-${i}`);
        });
      }

      expect(fnEffect).toBeCalledTimes(count);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(count);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      map.dispose();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(count);
      expect(map.size()).toBe(0);

      fnEffect.mockRestore();
      fnDispose.mockRestore();

      map.dispose();

      expect(fnEffect).toBeCalledTimes(0);
      expect(fnDispose).toBeCalledTimes(0);
      expect(map.size()).toBe(0);
    });

    it("should catch error in disposer", () => {
      const map = disposableMap();
      const spy = vi
        .spyOn(globalThis.console, "error")
        .mockImplementation(() => void 0);
      const error1 = new Error();
      const error2 = new Error();

      map.set("key1", () => {
        throw error1;
      });

      map.set("key2", () => {
        throw error2;
      });

      expect(globalThis.console.error).toBeCalledTimes(0);

      map.dispose();

      expect(globalThis.console.error).toBeCalledTimes(2);
      expect(globalThis.console.error).toBeCalledWith(error1);
      expect(globalThis.console.error).toBeCalledWith(error2);

      spy.mockRestore();
    });

    it("should be able to call dispose outside of map", () => {
      const map = disposableMap();
      const fnDispose = vi.fn();

      map.set("key1", fnDispose);
      expect(fnDispose).toHaveBeenCalledTimes(0);

      const dispose = map.dispose;
      dispose();
      expect(fnDispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("abortable", () => {
    it("should remove from map if an abortable is disposed", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const map = disposableMap();
      map.set("key1", disposer);

      expect(map.size()).toBe(1);

      disposer();

      expect(map.size()).toBe(0);
    });

    it("should remove from map if an abortable added by key is disposed", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const map = disposableMap();
      map.set("key1", disposer);

      expect(map.size()).toBe(1);

      disposer();

      expect(map.size()).toBe(0);
    });

    it("should rebind abortable to the map when added again", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const map = disposableMap();

      map.set("key1", disposer);

      map.set("key1", disposer);

      expect(map.size()).toBe(1);
      expect(fnDispose).toBeCalledTimes(1);

      disposer();

      expect(map.size()).toBe(0);
      expect(fnDispose).toBeCalledTimes(1);
    });
  });

  describe("nesting", () => {
    it("should be able to combine disposables", () => {
      const spyA = vi.fn();
      const spyB = vi.fn();

      class A implements IDisposable {
        public dispose = disposableMap();
        public constructor() {
          this.dispose.set("spyA", spyA);
        }
        public print = vi.fn();
      }

      class B implements IDisposable {
        public dispose = disposableMap();
        public a = this.dispose.set("A", new A());
        public constructor() {
          this.dispose.set("spyB", spyB);
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
});
