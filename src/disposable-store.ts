import type {
  DisposableDisposer,
  DisposableType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
  IDisposable,
} from "./interface";

import { isAbortable } from "./abortable";
import { dispose } from "./utils";

/**
 * A Disposable Store is an {@link IDisposable} that manages {@link Disposer}s and {@link IDisposable}s.
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
   * @internal
   */
  _disposables_?: Set<DisposableType>;

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
   * Add multiple {@link DisposableType}s to the store.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param disposables An array of {@link DisposableType}s.
   * @returns The same array of {@link DisposableType}s.
   */
  add<T extends DisposableType[]>(disposables: T): T;
  /**
   * Add each {@link DisposableType} to the store.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param disposables An array of {@link DisposableType}s.
   * @returns The same array of {@link DisposableType}s.
   */
  add<T extends DisposableType>(disposables: T | T[]): T | T[];

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
   * @param executor A function that returns either a {@link DisposableType} or `undefined | null`.
   * @returns The returned {@link DisposableType}, or `undefined` if the executor returns `undefined | null`.
   */
  make<T extends DisposableType>(
    executor: () => T | null | undefined | void
  ): T | void;
  /**
   * Invoke the executor function and add each {@link DisposableType} in the returned array to the store.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param executor A function that returns an array of {@link DisposableType}s.
   * @returns The returned array of {@link DisposableType}s.
   */
  make<T extends DisposableType[]>(executor: () => T): T;
  /**
   * Invoke the executor function and the returned {@link DisposableType}s to the store. Do nothing if `undefined | null` is returned.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param executor A function that returns either an array of {@link DisposableType}s or `undefined | null`.
   * @returns The returned array of {@link DisposableType}s, or `undefined` if the executor returns `undefined | null`.
   */
  make<T extends DisposableType[]>(
    executor: () => T | null | void | undefined
  ): T | void;
  /**
   * Invoke the executor function and the returned {@link DisposableType}s to the store. Do nothing if `undefined | null` is returned.
   *
   * Do nothing if a {@link DisposableType} is already in the store.
   *
   * @param executor A function that returns either an array of {@link DisposableType}s or `undefined | null`.
   * @returns The returned array of {@link DisposableType}s, or `undefined` if the executor returns `undefined | null`.
   */
  make<T extends DisposableType>(
    executor: () => T | T[] | null | void | undefined
  ): T | T[] | void;

  /**
   * Check if a {@link DisposableType} is in the store.
   *
   * @param disposable The {@link DisposableType}.
   * @returns `true` if the {@link DisposableType} is in the store, otherwise `false`.
   */
  has(disposable: DisposableType): boolean;

  /**
   * Remove the {@link DisposableType} from the store. Does not invoke the removed {@link DisposableType}.
   *
   * @param disposable The {@link DisposableType} to be removed.
   * @returns `true` if the {@link DisposableType} is found and removed, otherwise `false`.
   */
  remove(disposable: DisposableType): boolean;

  /**
   * Invoke the {@link DisposableType} and remove it from the store at the specific key.
   *
   * @param disposable The {@link DisposableType} to be flushed. Flush all if omitted.
   */
  flush(disposable?: DisposableType): void;

  /**
   * Flush and clear all of the {@link Disposer}s and {@link IDisposable}s in the store.
   */
  dispose(this: void): void;
}

function size(this: DisposableStore): number {
  return this._disposables_?.size || 0;
}

function has(this: DisposableStore, disposable: DisposableType): boolean {
  return this._disposables_?.has(disposable) || false;
}

function add<T extends DisposableType>(
  this: DisposableStore,
  disposables: T | T[]
): T | T[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  Array.isArray(disposables)
    ? disposables.forEach(_addOne, this)
    : _addOne.call(this, disposables);
  return disposables;
}

function _addOne<T extends DisposableType>(
  this: DisposableStore,
  disposable: T
): void {
  if (!this._disposables_?.has(disposable)) {
    (this._disposables_ ??= new Set()).add(disposable);
    if (isAbortable(disposable)) {
      disposable.abortable(() => this.remove(disposable));
    }
  }
}

function make<T extends DisposableType>(
  this: DisposableStore,
  executor: () => T | T[] | null
): T | T[] | null {
  const disposable = executor();
  return disposable && this.add(disposable);
}

function remove(this: DisposableStore, disposable: DisposableType): boolean {
  return this._disposables_?.delete(disposable) || false;
}

function flush(this: DisposableStore, disposable?: DisposableType): void {
  if (disposable) {
    if (this.remove(disposable)) {
      dispose(disposable);
    }
  } else {
    this.dispose();
  }
}

/**
 * Create a {@link DisposableStore} that manages {@link Disposer}s and {@link IDisposable}s.
 *
 * A {@link DisposableStore} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 *
 * A {@link DisposableStore} is also an {@link IDisposable}, which means it can be managed by another {@link DisposableStore}.
 *
 * @example
 * ```ts
 * import { type IDisposable, disposableStore } from "@wopjs/disposable";
 *
 * class A implements IDisposable {
 *   dispose = disposableStore()
 *   constructor() {
 *     this.dispose.add(...);
 *   }
 * }
 *
 * class B implements IDisposable {
 *   dispose = disposableStore()
 *   a = this.dispose.add(new A())
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
export function disposableStore(
  disposables?: DisposableType[]
): DisposableStore {
  function disposableStore(): void {
    (disposableStore as DisposableStore)._disposables_?.forEach(dispose);
    (disposableStore as DisposableStore)._disposables_?.clear();
  }
  disposableStore.dispose = disposableStore;
  disposableStore.size = size;
  disposableStore.has = has;
  disposableStore.add = add;
  disposableStore.make = make;
  disposableStore.remove = remove;
  disposableStore.flush = flush;
  if (disposables) {
    disposableStore.add(disposables);
  }
  return disposableStore;
}
