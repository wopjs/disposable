import { isAbortable } from "./abortable";
import {
  type DisposableDisposer,
  type DisposableType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
  type IDisposable,
} from "./interface";
import { dispose } from "./utils";

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
export interface DisposableMap<TKey = any> extends DisposableDisposer {
  /**
   * @internal
   */
  _disposables_?: Map<TKey, DisposableType>;

  /**
   * Flush and clear all of the {@link Disposer}s and {@link IDisposable}s in the Map.
   */
  (): void;

  /**
   * Flush and clear all of the {@link Disposer}s and {@link IDisposable}s in the Map.
   */
  dispose(): void;

  /**
   * Invoke the {@link DisposableType} and remove it from the Map at the specific key.
   *
   * @param key Map key of the {@link DisposableType}. Flush all if omitted.
   */
  flush(key?: TKey): void;

  /**
   * Check if a {@link DisposableType} at the specific key is in the Map.
   *
   * @param key Map key of the {@link DisposableType}.
   * @returns `true` if exists, otherwise `false`.
   */
  has(key: TKey): boolean;

  /**
   * Returns an iterable of keys in the map
   */
  keys(): IterableIterator<TKey>;
  /**
   * Invoke the executor function and add the returned {@link DisposableType} to the Map at the specific key.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param key Key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @param executor A function that returns a {@link DisposableType}.
   * @returns The returned {@link DisposableType}.
   */
  make<T extends DisposableType>(key: TKey, executor: () => T): T;

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
    key: TKey,
    executor: () => null | T | undefined | void
  ): T | void;

  /**
   * Remove the {@link DisposableType} at the specific key from the Map. Does not invoke the removed {@link DisposableType}.
   *
   * @param key Map key of the {@link DisposableType}.
   * @returns The removed {@link DisposableType} if exists, `undefined` if the {@link DisposableType} is not found.
   */
  remove(key: TKey): DisposableType | undefined;

  /**
   * Set a {@link DisposableType} to the Map at the specific key.
   *
   * Adding {@link DisposableType} to the same key will first invoke(`flush`) the previous {@link DisposableType} at that key.
   *
   * @param key Key for the {@link DisposableType}. Adding with same key will first invoke(`flush`) the previous {@link DisposableType}.
   * @param disposable A {@link DisposableType} .
   * @returns The same {@link DisposableType} .
   */
  set<T extends DisposableType>(key: TKey, disposable: T): T;

  /**
   * Get the number of {@link DisposableType}s in the Map.
   */
  size(): number;
}

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
export function disposableMap<TKey = any>(): DisposableMap<TKey> {
  function disposableMap(): void {
    if (disposableMap._isDisposing_) return;
    disposableMap._isDisposing_ = 1;
    (disposableMap as DisposableMap<TKey>)._disposables_?.forEach(dispose);
    (disposableMap as DisposableMap<TKey>)._disposables_?.clear();
    disposableMap._isDisposing_ = 0;
  }
  disposableMap._isDisposing_ = 0;
  disposableMap.dispose = disposableMap;
  disposableMap.keys = keys;
  disposableMap.size = size;
  disposableMap.has = has;
  disposableMap.set = set;
  disposableMap.make = make;
  disposableMap.remove = remove;
  disposableMap.flush = flush;
  return disposableMap;
}

function flush<K>(this: DisposableMap<K>, key?: K): void {
  if (key == null) {
    this.dispose();
  } else {
    dispose(this.remove(key));
  }
}

function has<K>(this: DisposableMap<K>, key: K): boolean {
  return this._disposables_?.has(key) || false;
}

function keys<K>(this: DisposableMap<K>): IterableIterator<K> {
  return (this._disposables_ || []).keys() as IterableIterator<K>;
}

function make<T extends DisposableType, K>(
  this: DisposableMap<K>,
  key: K,
  executor: () => null | T
): T | void {
  const disposable = executor();
  if (disposable) {
    return this.set(key, disposable);
  }
}

function remove<K>(this: DisposableMap<K>, key: K): DisposableType | undefined {
  const disposable = this._disposables_?.get(key);
  if (disposable) {
    this._disposables_?.delete(key);
    return disposable;
  }
}

function set<T extends DisposableType, K>(
  this: DisposableMap<K>,
  key: K,
  disposable: T
): T {
  this.flush(key);
  if (isAbortable(disposable)) {
    disposable.abortable(() => this.remove(key));
  }
  (this._disposables_ ??= new Map()).set(key, disposable);
  return disposable;
}

function size<K>(this: DisposableMap<K>): number {
  return this._disposables_?.size || 0;
}
