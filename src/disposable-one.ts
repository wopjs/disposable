import { isAbortable } from "./abortable";
import {
  type DisposableDisposer,
  type DisposableType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
  type IDisposable,
} from "./interface";
import { dispose } from "./utils";

/**
 * {@link DisposableOne} is an {@link IDisposable} that manages a single {@link Disposer} or {@link IDisposable}.
 *
 * The current {@link Disposer} and {@link IDisposable} in DisposableOne will be invoked(`flush`) when setting a new one.
 *
 * A {@link DisposableOne} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 */
export interface DisposableOne extends DisposableDisposer {
  /**
   * Flush and remove the current {@link Disposer} and {@link IDisposable}.
   */
  (): void;

  /**
   * The current {@link DisposableType}.
   */
  current?: DisposableType | null | void;

  /**
   * Flush the current {@link Disposer} and {@link IDisposable} and remove it.
   */
  dispose(this: void): void;
  /**
   * Invoke the current {@link DisposableType} and remove it.
   */
  flush(): void;

  /**
   * Check if the {@link DisposableType} is the current one.
   *
   * @param disposable The {@link DisposableType}.
   * @returns `true` if the {@link DisposableType} is the current one, otherwise `false`.
   */
  is(disposable: DisposableType): boolean;
  /**
   * Invoke the executor function and set the returned {@link DisposableType}.
   *
   * Do nothing if the {@link DisposableType} already exists.
   *
   * @param executor A function that returns a {@link DisposableType}.
   * @returns The returned {@link DisposableType}.
   */
  make<T extends DisposableType>(executor: () => T): T;
  /**
   * Invoke the executor function and set the returned {@link DisposableType}.
   *
   * Do nothing if `null | undefined` is returned or the returned {@link DisposableType} already exists.
   *
   * @param executor A function that returns either a {@link DisposableType} or `undefined | null`.
   * @returns The returned {@link DisposableType}, or `undefined` if the executor returns `undefined | null`.
   */
  make<T extends DisposableType>(
    executor: () => null | T | undefined | void
  ): T | void;

  /**
   * Invoke the executor function and set the returned {@link DisposableType}. Do nothing if `undefined | null` is returned.
   *
   * Do nothing if the {@link DisposableType} already exists.
   *
   * @param executor A function that returns either a {@link DisposableType} or `undefined | null`.
   * @returns The {@link DisposableType}, or `undefined` if the executor returns `undefined | null`.
   */
  make<T extends DisposableType[]>(
    executor: () => null | T | undefined | void
  ): T | void;

  /**
   * Remove the current {@link DisposableType}. Does not invoke the removed {@link DisposableType}.
   *
   * @returns `true` if a {@link DisposableType} exists and removed, otherwise `false`.
   */
  remove(): boolean;

  /**
   * Set a {@link DisposableType}.
   *
   * Do nothing if the same {@link DisposableType} already exists.
   *
   * Existing {@link DisposableType} will be flushed before setting a new one.
   *
   * @param disposable A {@link DisposableType} .
   * @returns The same {@link DisposableType} .
   */
  set<T extends DisposableType | null | undefined | void>(disposable: T): T;

  /**
   * Set a {@link DisposableType}.
   *
   * Do nothing if the same {@link DisposableType} already exists.
   *
   * Existing {@link DisposableType} will be flushed before setting a new one.
   *
   * @param disposable A {@link DisposableType} .
   * @returns The same {@link DisposableType} .
   */
  set<T extends DisposableType | null | undefined | void>(
    disposable?: T
  ): T | undefined;
}

/**
 * Create a {@link DisposableOne} that manages a single {@link Disposer} or {@link IDisposable}.
 *
 * A {@link DisposableOne} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 *
 * @example
 * ```ts
 * import { type IDisposable, DisposableOne } from "@wopjs/disposable";
 *
 * const dispose = disposableOne();
 *
 * dispose.set(() => console.log("hello"));
 *
 * dispose.set(() => console.log("world")); // prints "hello"
 *
 * dispose.set(() => console.log("foo")); // prints "world"
 *
 * dispose(); // prints "foo"
 * ```
 *
 * @param disposables Optional array of {@link DisposableType}s added to the store.
 * @returns A disposable store.
 */
export function disposableOne(
  disposable?: DisposableType | null | undefined | void
): DisposableOne {
  function disposableOne(): void {
    const { current } = disposableOne;
    if (current) {
      disposableOne.current = null;
      dispose(current);
    }
  }
  disposableOne.current = disposable;
  disposableOne.dispose = disposableOne;
  disposableOne.is = is;
  disposableOne.set = set;
  disposableOne.make = make;
  disposableOne.remove = remove;
  disposableOne.flush = disposableOne;
  return disposableOne;
}

function is(this: DisposableOne, disposable: DisposableType): boolean {
  return Object.is(this.current, disposable);
}

function make<T extends DisposableType>(
  this: DisposableOne,
  executor: () => null | T | undefined | void
): T | void {
  const disposable = executor();
  if (disposable) {
    return this.set(disposable);
  }
}

function remove(this: DisposableOne): boolean {
  const exists = !!this.current;
  this.current = undefined;
  return exists;
}

function set<T extends DisposableType | null | undefined | void>(
  this: DisposableOne,
  disposable?: T
): T | undefined {
  if (!disposable || !this.is(disposable)) {
    this.flush();
    this.current = disposable;
    if (isAbortable(disposable)) {
      disposable.abortable(() => {
        if (this.is(disposable)) {
          this.remove();
        }
      });
    }
  }

  return disposable;
}
