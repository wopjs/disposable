import type {
  DisposableId,
  DisposableType,
  DisposableKey,
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
   * If id is provided, it will be used as key in the store, otherwise the disposer/disposable will be used as key in the store.
   *
   * Adding with same key will first invoke(`flush`) the previous disposer/disposable at the key.
   *
   * @param disposable A disposer/disposable .
   * @param id Optional id for the disposer/disposable .
   * @returns The same disposer/disposable .
   */
  add<T extends DisposableType>(disposable: T, id?: DisposableId): T;
  /**
   * Add each disposer/disposable in an array to the store.
   *
   * Adding same disposer/disposable will first invoke(`flush`) the existing one.
   *
   * @param disposables An array of disposers/disposables.
   * @returns The same array of disposers/disposables.
   */
  add<T extends DisposableType[]>(disposables: T): T;
  /**
   * Add a disposer/disposable or an array of disposers/disposables in to the store.
   *
   * Id is ignored if it is an array of disposers/disposables.
   *
   * If id is provided, it will be used as key in the store, otherwise the disposer/disposable will be used as key in the store.
   *
   * Adding with same key will first invoke(`flush`) the previous disposer/disposable at the key.
   *
   * @param disposables A disposer/disposable or an array of disposers/disposables.
   * @param id Optional id for the disposer/disposable.
   * @returns The same disposer/disposable or the same array of disposers/disposables.
   */
  add<T extends DisposableType>(
    disposable: T | T[],
    id?: DisposableId
  ): T | T[] | void;

  /**
   * Invoke the executor function and add the returned disposer/disposable to the store.
   *
   * @param executor A function that returns a disposer/disposable.
   * @param id Optional id for the disposer/disposable. Adding with same id will first invoke(`flush`) the previous disposer/disposable.
   * @returns The returned disposer/disposable.
   */
  make<T extends DisposableType>(executor: () => T, id?: DisposableId): T;
  /**
   * Invoke the executor function and add the returned disposer/disposable to the store. Do nothing if `null` is returned.
   *
   * If id is provided, it will be used as key in the store, otherwise the returned disposer/disposable will be used as key in the store.
   *
   * Adding with same key will first invoke(`flush`) the previous disposer/disposable at the key.
   *
   * @param executor A function that returns either a disposer/disposable or `null`.
   * @param id Optional id for the disposer/disposable. Adding with same id will first invoke(`flush`) the previous disposer/disposable.
   * @returns The returned disposer/disposable, or `undefined` if the executor returns `null`.
   */
  make<T extends DisposableType>(
    executor: () => T | null,
    id?: DisposableId
  ): T | void;
  /**
   * Invoke the executor function and add each disposer/disposable in the returned array to the store.
   *
   * Adding same disposer/disposable will first invoke(`flush`) the existing one.
   *
   * @param executor A function that returns an array of disposers/disposables.
   * @returns The returned array of disposers/disposables.
   */
  make<T extends DisposableType[]>(executor: () => T): T;
  /**
   * Invoke the executor function and add each of the returned disposers/disposables to the store. Do nothing if `null` is returned.
   *
   * Adding same disposer/disposable  first invoke(`flush`) the existing one.
   *
   * @param executor A function that returns either an array of disposers/disposables or `undefined`.
   * @param The returned array of disposers/disposables, or `undefined` if the executor returns `undefined`.
   */
  make<T extends DisposableType[]>(executor: () => T | null): T | void;

  /**
   * Check whether the store has the disposer/disposable.
   *
   * @param key disposer/disposable or store id of the disposer/disposable.
   * @returns Whether the store has the disposer/disposable.
   */
  has(key: DisposableKey): boolean;

  /**
   * Check whether the store has the disposer.
   * @param key disposer/disposable or store id of the disposer/disposable.
   * @returns Whether the store has the disposer/disposable.
   */
  get<T extends DisposableType = DisposableType>(
    key: DisposableKey
  ): T | undefined;

  /**
   * Remove the disposer/disposable from the store. Does not invoke the disposer.
   *
   * @param key disposer/disposable or store id of the disposer/disposable.
   * @returns `true` if the disposer/disposable is removed, `false` if the disposer/disposable is not found.
   */
  remove(key: DisposableKey): boolean;

  /**
   * Invoke the disposer/disposable and remove it from the store.
   *
   * @param key disposer/disposable or store id of the disposer/disposable.
   */
  flush(key: DisposableKey): void;

  /**
   * Flush and clear all of the disposers/disposables in the store.
   */
  dispose(this: void): void;
}

interface DisposableStoreImpl extends DisposableStore {
  _disposables_: Map<DisposableKey, DisposableType>;
}

const methods: Omit<PickMethods<DisposableStoreImpl>, "dispose"> = {
  size(this: DisposableStoreImpl): number {
    return this._disposables_.size;
  },
  add<T extends DisposableType>(
    this: DisposableStoreImpl,
    disposable: T | T[],
    id?: DisposableId
  ): T | T[] | void {
    if (Array.isArray(disposable)) {
      for (const d of disposable) {
        this.add(d);
      }
      return disposable;
    }
    const key: DisposableKey = id == null ? disposable : id;
    this.flush(key);
    this._disposables_.set(key, disposable);
    if (isAbortable(disposable)) {
      disposable.abortable(() => this.remove(key));
    }
    return disposable;
  },
  make<T extends DisposableType>(
    this: DisposableStoreImpl,
    executor: () => T | T[] | null,
    id?: DisposableId
  ): T | void {
    const disposers = executor();
    if (disposers) {
      return this.add(disposers as T, id);
    }
  },
  has(this: DisposableStoreImpl, key: DisposableKey): boolean {
    return this._disposables_.has(key);
  },
  get<T extends DisposableType = DisposableType>(
    this: DisposableStoreImpl,
    key: DisposableKey
  ): T | undefined {
    return this._disposables_.get(key) as T | undefined;
  },
  remove(this: DisposableStoreImpl, key: DisposableKey): boolean {
    return this._disposables_.delete(key);
  },
  flush(this: DisposableStoreImpl, key: DisposableKey): void {
    const disposable = this.get(key);
    if (disposable) {
      this.remove(key);
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
export const disposable = (
  disposables?: DisposableType | DisposableType[]
): DisposableStore => {
  const disposer: Disposer &
    OmitMethods<DisposableStoreImpl> &
    Pick<DisposableStore, "dispose"> = (): void => {
    disposer._disposables_.forEach(invokeDispose);
    disposer._disposables_.clear();
  };
  disposer._disposables_ = new Map();
  disposer.dispose = disposer;
  const store = Object.assign(disposer, methods);
  if (disposables) {
    store.add(disposables);
  }
  return store;
};
