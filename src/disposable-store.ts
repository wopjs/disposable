import type {
  DisposableKey,
  DisposableType,
  DisposableDisposer,
  Disposer,
} from "./interface";
import type { OmitMethods, PickMethods } from "./utils";

import { isAbortable } from "./abortable";
import { invokeDispose } from "./utils";

/**
 * A disposable store which manages disposer/disposable.
 *
 * All disposers/disposables will be invoked(`flush`) when store is disposed.
 *
 * It implements `DisposableDisposer` interface, so it can be used as both a disposable and a disposer.
 */
export interface DisposableStore extends DisposableDisposer {
  /**
   * Flush and clear all of the disposers/disposables in the store.
   */
  (): void;

  /**
   * Get the number of disposers in the store.
   */
  size(): number;

  /**
   * Add a disposer/disposable to the store.
   *
   * Do nothing if the disposer/disposable is already in the store.
   *
   * @param disposable A disposer/disposable .
   * @returns The same disposer/disposable .
   */
  add<T extends DisposableType>(disposable: T): T;

  /**
   * Add a disposer/disposable to the store at the specific key.
   *
   * Adding disposer/disposable to the same key will first invoke(`flush`) the previous disposer/disposable at that key.
   *
   * @param disposable A disposer/disposable .
   * @param key Store key for the disposer/disposable. Adding with same key will first invoke(`flush`) the previous disposer/disposable.
   * @returns The same disposer/disposable .
   */
  add<T extends DisposableType>(disposable: T, key: DisposableKey): T;

  /**
   * Add an array of disposers/disposables to the store.
   *
   * Do nothing if a disposer/disposable is already in the store.
   *
   * @param disposables An array of disposers/disposables.
   * @returns The same array of disposers/disposables.
   */
  bulkAdd<T extends DisposableType[]>(disposables: T): T;

  /**
   * Invoke the executor function and add the returned disposer/disposable to the store.
   *
   * Do nothing if the disposer/disposable is already in the store.
   *
   * @param executor A function that returns a disposer/disposable.
   * @returns The returned disposer/disposable.
   */
  make<T extends DisposableType>(executor: () => T): T;
  /**
   * Invoke the executor function and add the returned disposer/disposable to the store.
   *
   * Do nothing if `null | undefined` is returned or the returned disposer/disposable is already in the store.
   *
   * @param executor A function that returns either a disposer/disposable or `null`.
   * @returns The returned disposer/disposable, or `undefined` if the executor returns `null`.
   */
  make<T extends DisposableType>(
    executor: () => T | null | undefined | void
  ): T | void;
  /**
   * Invoke the executor function and add the returned disposer/disposable to the store at the specific key.
   *
   * Adding disposer/disposable to the same key will first invoke(`flush`) the previous disposer/disposable at that key.
   *
   * @param executor A function that returns a disposer/disposable.
   * @param key Store key for the disposer/disposable. Adding with same key will first invoke(`flush`) the previous disposer/disposable.
   * @returns The returned disposer/disposable.
   */
  make<T extends DisposableType>(executor: () => T, key: DisposableKey): T;
  /**
   * Invoke the executor function and add the returned disposer/disposable to the store at the specific key.
   *
   * Do nothing if `null | undefined` is returned or the returned disposer/disposable is already in the store.
   *
   * Adding disposer/disposable to the same key will first invoke(`flush`) the previous disposer/disposable at that key.
   *
   * @param executor A function that returns either a disposer/disposable or `null | undefined`.
   * @param key Store key for the disposer/disposable. Adding with same key will first invoke(`flush`) the previous disposer/disposable.
   * @returns The returned disposer/disposable, or `undefined` if the executor returns `null | undefined`.
   */
  make<T extends DisposableType>(
    executor: () => T | null | undefined | void,
    key: DisposableKey
  ): T | void;

  /**
   * Invoke the executor function and add each disposer/disposable in the returned array to the store.
   *
   * Do nothing if a disposer/disposable is already in the store.
   *
   * @param executor A function that returns an array of disposers/disposables.
   * @returns The returned array of disposers/disposables.
   */
  bulkMake<T extends DisposableType[]>(executor: () => T): T;
  /**
   * Invoke the executor function and the returned disposers/disposables to the store. Do nothing if `undefined | null` is returned.
   *
   * Do nothing if a disposer/disposable is already in the store.
   *
   * @param executor A function that returns either an array of disposers/disposables or `undefined | null`.
   * @returns The returned array of disposers/disposables, or `undefined` if the executor returns `undefined | null`.
   */
  bulkMake<T extends DisposableType[]>(
    executor: () => T | null | void | undefined
  ): T | void;

  /**
   * Remove the disposer/disposable at the specific key from the store. Does not invoke the disposer.
   *
   * @param key Store key of the disposer/disposable.
   * @returns The removed disposer/disposable if exists, `undefined` if the disposer/disposable is not found.
   */
  remove(key: DisposableKey): DisposableType | undefined;

  /**
   * Invoke the disposer/disposable and remove it from the store at the specific key.
   *
   * @param key Store key of the disposer/disposable.
   */
  flush(key: DisposableKey): void;

  /**
   * Flush and clear all of the disposers/disposables in the store.
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
    } else {
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
 * Create a disposable store that manages disposables.
 *
 * A disposable store is also a disposer, which means it can be added to another disposable store.
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
 * @param disposables Optional initial disposable or an array of disposables added to the store.
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
