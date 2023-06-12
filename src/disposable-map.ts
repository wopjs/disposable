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
 * A Disposable Map is an {@link IDisposable} store that manages {@link Disposer}s and {@link IDisposable}s with keys.
 *
 * All {@link Disposer}s and {@link IDisposable}s in the Map will be invoked(`flush`) when the Map is disposed.
 *
 * A {@link DisposableMap} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 *
 * A {@link DisposableMap} is also an {@link IDisposable}, which means it can be managed by another {@link DisposableMap}.
 *
 */
export interface DisposableMap extends DisposableDisposer {
  /**
   * Flush and clear all of the {@link Disposer}s and {@link IDisposable}s in the Map.
   */
  (): void;

  /**
   * Get the number of {@link DisposableType}s in the Map.
   */
  size(): number;

  /**
   * Set a {@link DisposableType} to the Map at the specific key.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param key Key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @param disposable A {@link DisposableType} .
   * @returns The same {@link DisposableType} .
   */
  set<T extends DisposableType>(key: DisposableKey, disposable: T): T;

  /**
   * Invoke the executor function and add the returned {@link DisposableType} to the Map at the specific key.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param key Key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @param executor A function that returns a {@link DisposableType}.
   * @returns The returned {@link DisposableType}.
   */
  make<T extends DisposableType>(key: DisposableKey, executor: () => T): T;
  /**
   * Invoke the executor function and add the returned {@link DisposableType} to the Map at the specific key.
   *
   * Do nothing if `null | undefined` is returned or the returned {@link DisposableType} is already in the Map.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param key Key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @param executor A function that returns either a {@link DisposableType} or `null | undefined`.
   * @returns The returned {@link DisposableType}, or `undefined` if the executor returns `null | undefined`.
   */
  make<T extends DisposableType>(
    key: DisposableKey,
    executor: () => T | null | undefined | void
  ): T | void;

  /**
   * Remove the {@link DisposableType} at the specific key from the Map. Does not invoke the removed {@link DisposableType}.
   *
   * @param key Map key of the {@link DisposableType}.
   * @returns The removed {@link DisposableType} if exists, `undefined` if the {@link DisposableType} is not found.
   */
  remove(key: DisposableKey): DisposableType | undefined;

  /**
   * Check if a {@link DisposableType} at the specific key is in the Map.
   *
   * @param key Map key of the {@link DisposableType}.
   * @returns `true` if exists, otherwise `false`.
   */
  has(key: DisposableKey): boolean;

  /**
   * Invoke the {@link DisposableType} and remove it from the Map at the specific key.
   *
   * @param key Map key of the {@link DisposableType}.
   */
  flush(key: DisposableKey): void;

  /**
   * Flush and clear all of the {@link Disposer}s and {@link IDisposable}s in the Map.
   */
  dispose(this: void): void;
}

interface DisposableMapImpl extends DisposableMap {
  _disposables_: Map<DisposableKey, DisposableType>;
}

const methods: Omit<PickMethods<DisposableMapImpl>, "dispose"> = {
  size(this: DisposableMapImpl): number {
    return this._disposables_.size;
  },
  has(this: DisposableMapImpl, key: DisposableKey): boolean {
    return this._disposables_.has(key);
  },
  set<T extends DisposableType>(
    this: DisposableMapImpl,
    key: DisposableKey,
    disposable: T
  ): T {
    this.flush(key);
    if (isAbortable(disposable)) {
      disposable.abortable(() => this.remove(key));
    }
    this._disposables_.set(key, disposable);
    return disposable;
  },
  make<T extends DisposableType>(
    this: DisposableMapImpl,
    key: DisposableKey,
    executor: () => T | null
  ): T | void {
    const disposable = executor();
    if (disposable) {
      return this.set(key, disposable);
    }
  },
  remove(
    this: DisposableMapImpl,
    key: DisposableKey
  ): DisposableType | undefined {
    const disposable = this._disposables_.get(key);
    if (disposable) {
      this._disposables_.delete(key);
      return disposable;
    }
  },
  flush(this: DisposableMapImpl, key: DisposableKey): void {
    const disposable = this.remove(key);
    if (disposable) {
      invokeDispose(disposable);
    }
  },
};

/**
 * Create a {@link DisposableMap} that manages {@link Disposer}s and {@link IDisposable}s with key.
 *
 * A {@link DisposableMap} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 *
 * A {@link DisposableMap} is also an {@link IDisposable}, which means it can be managed by another {@link DisposableMap}.
 *
 * @example
 * ```js
 * import { disposableMap } from "@wopjs/disposable";
 *
 * const listen = (target, event, listener) => {
 *   target.addEventListener(event, listener);
 *   return () => target.removeEventListener(event, listener);
 * }
 *
 * const map = disposableMap();
 * map.set("myClick", listen(window, "click", console.log));
 * map.make("anotherClick", () => {
 *   const listener = console.log;
 *   window.addEventListener("click", listener);
 *   return () => window.removeEventListener("click", listener);
 * });
 *
 * map.dispose();
 * ```
 *
 * @returns A disposable Map.
 */
export const disposableMap = (): DisposableMap => {
  const disposer: Disposer &
    OmitMethods<DisposableMapImpl> &
    Pick<DisposableMap, "dispose"> = (): void => {
    disposer._disposables_.forEach(invokeDispose);
    disposer._disposables_.clear();
  };
  disposer._disposables_ = new Map();
  disposer.dispose = disposer;
  return Object.assign(disposer, methods);
};
