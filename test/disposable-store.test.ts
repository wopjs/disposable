import { describe, it, expect, vi } from "vitest";
import type { DisposableDisposer, IDisposable } from "../src";
import { abortable, disposable } from "../src";

describe("DisposableStore", () => {
  describe("new", () => {
    it("should create a empty store", () => {
      const store = disposable();
      expect(store.size()).toBe(0);
    });

    it("should add initial disposable", () => {
      const disposer = vi.fn();
      const store = disposable(disposer);
      expect(store.size()).toBe(1);
      expect(store.has(disposer)).toBe(true);
    });

    it("should add an array of initial disposables", () => {
      const disposers = Array(5)
        .fill(0)
        .map(() => vi.fn());
      const store = disposable(disposers);
      expect(store.size()).toBe(disposers.length);
      for (const disposer of disposers) {
        expect(store.has(disposer)).toBe(true);
      }
    });
  });

  describe("add", () => {
    it("should add a function disposer to the store", () => {
      const store = disposable();
      const disposer = vi.fn();

      const returnedDisposer = store.add(disposer);

      expect(returnedDisposer).toBe(disposer);
      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
    });

    it("should add a disposable instance to the store", () => {
      const store = disposable();
      const disposer = { dispose: vi.fn() };

      const returnedDisposable = store.add(disposer);

      expect(returnedDisposable).toBe(disposer);
      expect(disposer.dispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
    });

    it("should add a list of disposers", () => {
      const store = disposable();
      const disposers = Array.from({ length: 5 }).map(() => vi.fn());

      const returnedValue = store.add(disposers);

      expect(returnedValue).toBe(disposers);

      disposers.forEach(disposer => {
        expect(disposer).toBeCalledTimes(0);
      });
      expect(store.size()).toBe(5);
    });

    it("should add two disposers", () => {
      const store = disposable();
      const disposer1 = vi.fn();
      const disposer2 = vi.fn();

      store.add(disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.add(disposer2);

      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(2);
    });

    it("should flush old one when adding the same disposable again", () => {
      const store = disposable();
      const disposer1 = vi.fn();

      store.add(disposer1);

      expect(disposer1).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
      expect(store.has(disposer1)).toBe(true);

      store.add(disposer1);

      expect(disposer1).toBeCalledTimes(1);
      expect(store.size()).toBe(1);
      expect(store.has(disposer1)).toBe(true);
    });

    it("should flush previous disposable when adding a new disposable with the same id", () => {
      const store = disposable();
      const disposer1 = vi.fn();

      store.add(disposer1, "id1");

      expect(disposer1).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      const disposer2 = vi.fn();
      store.add(disposer2, "id1");

      expect(disposer1).toBeCalledTimes(1);
      expect(disposer2).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
    });

    it("should add two records if added a same disposable with itself and id", () => {
      const store = disposable();
      const disposer = vi.fn();

      store.add(disposer);

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.add(disposer, "id1");

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(2);
    });

    it("should not get the disposable by function if added with id", () => {
      const store = disposable();
      const disposer = vi.fn();

      store.add(disposer, "id1");

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
      expect(store.has("id1")).toBe(true);
      expect(store.has(disposer)).toBe(false);
    });
  });

  describe("make", () => {
    it("should run executor function and add the returned disposable to the store", () => {
      const store = disposable();
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
      const store = disposable();
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
      const store = disposable();

      store.make(() => {
        return null;
      });

      expect(store.size()).toBe(0);
    });

    it("should return the disposable", () => {
      const store = disposable();
      const disposer = vi.fn();

      const returnedDisposer = store.make(() => {
        return disposer;
      });

      expect(disposer).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
      expect(returnedDisposer).toBe(disposer);
    });

    it("should flush effect with same id when making a new disposable", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      store.make(() => {
        fnEffect("execute1");
        return () => fnDispose("dispose1");
      }, "id1");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute1");
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      fnEffect.mockReset();
      fnDispose.mockReset();

      store.make(() => {
        fnEffect("execute2");
        return () => fnDispose("dispose2");
      }, "id1");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnEffect).lastCalledWith("execute2");
      expect(fnDispose).toBeCalledTimes(1);
      expect(fnDispose).lastCalledWith("dispose1");
      expect(store.size()).toBe(1);
    });

    it("should add an array of disposers returned from executor", () => {
      const store = disposable();
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
      expect(disposer1).toBeCalledTimes(1);
      expect(disposer2).toBeCalledTimes(0);
      expect(disposer3).toBeCalledTimes(1);
      expect(disposer4).toBeCalledTimes(0);
      expect(store.size()).toBe(4);
    });
  });

  describe("has", () => {
    it("should return true if the disposable is in the store", () => {
      const store = disposable();
      const disposer = store.add(() => void 0);
      expect(store.has(disposer)).toBe(true);
      expect(store.has(() => void 0)).toBe(false);
      expect(store.has("22")).toBe(false);
    });

    it("should return false if checking a disposable by itself but it was added by id", () => {
      const store = disposable();
      const disposer = store.add(() => void 0, "id-a");
      expect(store.has("id-a")).toBe(true);
      expect(store.has(disposer)).toBe(false);
    });
  });

  describe("get", () => {
    it("should get the disposable from store by id", () => {
      const store = disposable();
      const disposer = store.add(() => void 0, "id-a");
      expect(store.get("id-a")).toBe(disposer);
      expect(store.get(disposer)).toBeUndefined();
    });

    it("should get the disposable from store by itself", () => {
      const store = disposable();
      const disposer = store.add(() => void 0);
      expect(store.get(disposer)).toBe(disposer);
    });
  });

  describe("remove", () => {
    it("should remove a disposable by itself", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      const disposer = store.make(() => {
        fnEffect("effect");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove(disposer);

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should remove a disposable by id", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      store.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      }, "a-id");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove("a-id");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should not remove a disposable by itself if added by id", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      store.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      }, "a-id");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove("a-id");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);

      const disposer = store.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      }, "a-id");

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove(disposer);

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);
    });

    it("should remove disposers added by array", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDisposers = Array.from({ length: 5 }).map(() => vi.fn());

      const disposers = store.make(() => {
        fnEffect("execute");
        return fnDisposers.map(
          (fnDisposer, i) => () => fnDisposer(`dispose${i}`)
        );
      });

      expect(fnEffect).toBeCalledTimes(1);
      fnDisposers.forEach(disposer => {
        expect(disposer).toBeCalledTimes(0);
      });
      expect(store.size()).toBe(5);

      store.remove(disposers[0]);

      expect(fnEffect).toBeCalledTimes(1);
      fnDisposers.forEach(disposer => {
        expect(disposer).toBeCalledTimes(0);
      });
      expect(store.size()).toBe(4);

      store.remove(disposers[1]);

      expect(fnEffect).toBeCalledTimes(1);
      fnDisposers.forEach(disposer => {
        expect(disposer).toBeCalledTimes(0);
      });
      expect(store.size()).toBe(3);
    });

    it("should be able to call remove on a removed id", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      store.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      }, "a-id");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove("a-id");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);

      store.remove("a-id");

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should remove two disposers", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      const disposer1 = store.make(() => {
        fnEffect("execute1");
        return () => fnDispose("dispose1");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute1");
      expect(store.size()).toBe(1);

      const disposer2 = store.make(() => {
        fnEffect("execute2");
        return () => fnDispose("dispose2");
      });

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute2");
      expect(store.size()).toBe(2);

      store.remove(disposer1);

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.remove(disposer2);

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(0);
    });

    it("should return true if exists otherwise false", () => {
      const store = disposable();
      const fnDispose = vi.fn();

      const disposer = store.add(() => fnDispose);

      expect(store.remove(disposer)).toBe(true);
      expect(store.remove(disposer)).toBe(false);
    });
  });

  describe("flush", () => {
    it("should flush a disposable", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      const disposer = store.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.flush(disposer);

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(1);
      expect(store.size()).toBe(0);
    });

    it("should call `.dispose()` instead if exist", () => {
      const store = disposable();
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

    it("should be able to flush each disposable added from array", () => {
      const store = disposable();
      const fnDisposers = Array.from({ length: 5 }).map(() => vi.fn());

      const disposers = store.add(
        fnDisposers.map((fn, i) => () => fn(`dispose-${i}`))
      );

      fnDisposers.forEach(disposer => {
        expect(disposer).toBeCalledTimes(0);
      });
      expect(store.size()).toBe(fnDisposers.length);

      store.flush(disposers[0]);
      store.flush(disposers[2]);

      expect(fnDisposers[0]).toBeCalledTimes(1);
      expect(fnDisposers[1]).toBeCalledTimes(0);
      expect(fnDisposers[2]).toBeCalledTimes(1);
      expect(fnDisposers[3]).toBeCalledTimes(0);
      expect(fnDisposers[4]).toBeCalledTimes(0);
      expect(store.size()).toBe(3);
    });

    it("should be able to call flush on a flushed disposable", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      const disposer = store.make(() => {
        fnEffect("execute");
        return () => fnDispose("dispose");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(store.size()).toBe(1);

      store.flush(disposer);

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(1);
      expect(store.size()).toBe(0);

      store.flush(disposer);

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(1);
      expect(store.size()).toBe(0);
    });

    it("should flush two disposers", () => {
      const store = disposable();
      const fnEffect = vi.fn();
      const fnDispose = vi.fn();

      const disposer1 = store.make(() => {
        fnEffect("execute1");
        return () => fnDispose("dispose1");
      });

      expect(fnEffect).toBeCalledTimes(1);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute1");
      expect(store.size()).toBe(1);

      const disposer2 = store.make(() => {
        fnEffect("execute2");
        return () => fnDispose("dispose2");
      });

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(0);
      expect(fnEffect).lastCalledWith("execute2");
      expect(store.size()).toBe(2);

      store.flush(disposer1);

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(1);
      expect(store.size()).toBe(1);

      store.flush(disposer2);

      expect(fnEffect).toBeCalledTimes(2);
      expect(fnDispose).toBeCalledTimes(2);
      expect(store.size()).toBe(0);
    });

    it("should catch error in disposer", () => {
      const store = disposable();
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
  });

  describe("dispose", () => {
    it("should flush all disposables on disposed", () => {
      const store = disposable();
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
      const store = disposable();
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
  });

  describe("abortable", () => {
    it("should remove from store if an abortable is disposed", () => {
      const fnDispose = vi.fn();
      const disposer = abortable(() => fnDispose("dispose"));
      const store = disposable();
      store.add(disposer);

      expect(store.size()).toBe(1);
      expect(store.has(disposer)).toBe(true);

      disposer();

      expect(store.size()).toBe(0);
    });
  });

  describe("nesting", () => {
    it("should be able to combine disposables", () => {
      const spyA = vi.fn();
      const spyB = vi.fn();

      class A implements IDisposable {
        public dispose = disposable();
        public constructor() {
          this.dispose.add(spyA);
        }
        public print = vi.fn();
      }

      class B implements IDisposable {
        public dispose = disposable();
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
});
