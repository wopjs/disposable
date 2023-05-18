import type {
  DisposableKey,
  DisposableType,
  DisposableDisposer,
  Disposer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
  IDisposable,
} from "./interface";
import type { OmitMethods, PickMethods } from "./utils";

import { isAbortable } from "./abortable";
import { invokeDispose } from "./utils";

/**
 * A disposable store is an {@link IDisposable} that manages {@link Disposer}s and {@link IDisposable}s.
 *
 * All {@link Disposer}s and {@link IDisposable}s in the store will be invoked(`flush`) when the store is disposed.
 *
 * A {@link DisposableStore} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 *
 * A {@link DisposableStore} is also an {@link IDisposable}, which means it can be managed by another {@link DisposableStore}.
 *
 */
export interface DisposableStore extends DisposableDisposer {
  /**
   * Flush and clear all of the {@link Disposer}s and {@link IDisposable}s in the store.
   */
  (): void;

  /**
   * Get the number of {@link DisposableType}s in the store.
   */
  size(): number;

  /**
   * Add a {@link DisposableType} to the store.
   *
   * Do nothing if the {@link DisposableType} is already in the store.
   *
   * @param disposable A {@link DisposableType} .
   * @returns The same {@link DisposableType} .
   */
  add<T extends DisposableType>(disposable: T): T;

  /**
   * Add a {@link DisposableType} to the store at the specific key.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param disposable A {@link DisposableType} .
   * @param key Store key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @returns The same {@link DisposableType} .
   */
  add<T extends DisposableType>(disposable: T, key: DisposableKey): T;

  /**
   * Add an array of {@link DisposableType}s to the store.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param disposables An array of {@link DisposableType}s.
   * @returns The same array of {@link DisposableType}s.
   */
  bulkAdd<T extends DisposableType[]>(disposables: T): T;

  /**
   * Invoke the executor function and add the returned {@link DisposableType} to the store.
   *
   * Do nothing if the {@link DisposableType} is already in the store.
   *
   * @param executor A function that returns a {@link DisposableType}.
   * @returns The returned {@link DisposableType}.
   */
  make<T extends DisposableType>(executor: () => T): T;
  /**
   * Invoke the executor function and add the returned {@link DisposableType} to the store.
   *
   * Do nothing if `null | undefined` is returned or the returned {@link DisposableType} is already in the store.
   *
   * @param executor A function that returns either a {@link DisposableType} or `null`.
   * @returns The returned {@link DisposableType}, or `undefined` if the executor returns `null`.
   */
  make<T extends DisposableType>(
    executor: () => T | null | undefined | void
  ): T | void;
  /**
   * Invoke the executor function and add the returned {@link DisposableType} to the store at the specific key.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param executor A function that returns a {@link DisposableType}.
   * @param key Store key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @returns The returned {@link DisposableType}.
   */
  make<T extends DisposableType>(executor: () => T, key: DisposableKey): T;
  /**
   * Invoke the executor function and add the returned {@link DisposableType} to the store at the specific key.
   *
   * Do nothing if `null | undefined` is returned or the returned {@link DisposableType} is already in the store.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param executor A function that returns either a {@link DisposableType} or `null | undefined`.
   * @param key Store key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @returns The returned {@link DisposableType}, or `undefined` if the executor returns `null | undefined`.
   */
  make<T extends DisposableType>(
    executor: () => T | null | undefined | void,
    key: DisposableKey
  ): T | void;

  /**
   * Invoke the executor function and add each {@link DisposableType} in the returned array to the store.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param executor A function that returns an array of {@link DisposableType}s.
   * @returns The returned array of {@link DisposableType}s.
   */
  bulkMake<T extends DisposableType[]>(executor: () => T): T;
  /**
   * Invoke the executor function and the returned {@link DisposableType}s to the store. Do nothing if `undefined | null` is returned.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param executor A function that returns either an array of {@link DisposableType}s or `undefined | null`.
   * @returns The returned array of {@link DisposableType}s, or `undefined` if the executor returns `undefined | null`.
   */
  bulkMake<T extends DisposableType[]>(
    executor: () => T | null | void | undefined
  ): T | void;

  /**
   * Remove the {@link DisposableType} at the specific key from the store. Does not invoke the removed {@link DisposableType}.
   *
   * @param key Store key of the {@link DisposableType}.
   * @returns The removed {@link DisposableType} if exists, `undefined` if the {@link DisposableType} is not found.
   */
  remove(key: DisposableKey): DisposableType | undefined;

  /**
   * Invoke the {@link DisposableType} and remove it from the store at the specific key.
   *
   * @param key Store key of the {@link DisposableType}.
   */
  flush(key: DisposableKey): void;

  /**
   * Flush and clear all of the {@link Disposer}s and {@link Disposable}s in the store.
   */
  dispose(this: void): void;
}

interface DisposableStoreImpl extends DisposableStore {
  _disposables_: Set<DisposableType>;
  _keys_?: Map<DisposableKey, DisposableType>;
}

const methods: Omit<PickMethods<DisposableStoreImpl>, "dispose"> = {
  size(this: DisposableStoreImpl): number {
    return this._disposables_.size;
  },
  add<T extends DisposableType>(
    this: DisposableStoreImpl,
    disposable: T,
    key?: DisposableKey
  ): T | void {
    if (key != null) {
      this.flush(key);
      if (isAbortable(disposable)) {
        disposable.abortable(() => this.remove(key));
      }
      (this._keys_ || (this._keys_ = new Map())).set(key, disposable);
    } else if (!this._disposables_.has(disposable)) {
      if (isAbortable(disposable)) {
        disposable.abortable(() => this._disposables_.delete(disposable));
      }
    }
    this._disposables_.add(disposable);
    return disposable;
  },
  bulkAdd<T extends DisposableType[]>(
    this: DisposableStoreImpl,
    disposables: T
  ): T {
    for (const disposable of disposables) {
      this.add(disposable);
    }
    return disposables;
  },
  make<T extends DisposableType>(
    this: DisposableStoreImpl,
    executor: () => T | null,
    id?: DisposableKey
  ): T | void {
    const disposable = executor();
    if (disposable) {
      return this.add(disposable, id as DisposableKey);
    }
  },
  bulkMake<T extends DisposableType[]>(
    this: DisposableStoreImpl,
    executor: () => T | null | void
  ): T | void {
    const disposers = executor();
    if (disposers) {
      return this.bulkAdd(disposers);
    }
  },
  remove(
    this: DisposableStoreImpl,
    key: DisposableKey
  ): DisposableType | undefined {
    if (this._keys_) {
      const disposable = this._keys_.get(key);
      if (
        disposable &&
        this._keys_.delete(key) &&
        this._disposables_.delete(disposable)
      ) {
        return disposable;
      }
    }
  },
  flush(this: DisposableStoreImpl, key: DisposableKey): void {
    const disposable = this.remove(key);
    if (disposable) {
      invokeDispose(disposable);
    }
  },
};

/**
 * Create a {@link DisposableStore} that manages {@link Disposer}s and {@link IDisposable}s.
 *
 * A {@link DisposableStore} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 *
 * A {@link DisposableStore} is also an {@link IDisposable}, which means it can be managed by another {@link DisposableStore}.
 *
 * @example
 * ```ts
 * import { type IDisposable, disposable } from "@wopjs/disposable";
 *
 * class A implements IDisposable {
 *   dispose = disposable()
 *   constructor() {
 *     this.dispose.add(...);
 *   }
 * }
 *
 * class B implements IDisposable {
 *   dispose = disposable()
 *   a = this.disposable.add(new A())
 *   constructor() {
 *     this.dispose.add(...);
 *  }
 * }
 *
 * const b = new B();
 * b.dispose(); // dispose both `b` and `b.a`.
 * ```
 *
 * @param disposables Optional array of {@link DisposableType}s added to the store.
 * @returns A disposable store.
 */
export const disposable = (disposables?: DisposableType[]): DisposableStore => {
  const disposer: Disposer &
    OmitMethods<DisposableStoreImpl> &
    Pick<DisposableStore, "dispose"> = (): void => {
    disposer._disposables_.forEach(invokeDispose);
    disposer._disposables_.clear();
    disposer._keys_ && disposer._keys_.clear();
  };
  disposer._disposables_ = new Set();
  disposer.dispose = disposer;
  const store = Object.assign(disposer, methods);
  if (disposables) {
    store.bulkAdd(disposables);
  }
  return store;
};
