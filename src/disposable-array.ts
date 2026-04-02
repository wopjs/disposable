import { isAbortable } from "./abortable";
import {
  type DisposableDisposer,
  type DisposableType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
  type IDisposable,
} from "./interface";
import { dispose } from "./utils";

/**
 * A Disposable Array is an {@link IDisposable} store that manages {@link Disposer}s and {@link IDisposable}s in array order.
 *
 * This structure is optimized for frequent `push` operations.
 *
 * A {@link DisposableArray} is also a {@link Disposer}, which means it can be the `dispose` method of an {@link IDisposable}.
 *
 * A {@link DisposableArray} is also an {@link IDisposable}, which means it can be managed by another disposable container.
 */
export interface DisposableArray extends DisposableDisposer {
  /**
   * @internal
   */
  _disposables_?: DisposableType[] | void;

  /**
   * Flush and clear all disposables in the array.
   */
  (): void;

  /**
   * Flush and clear all disposables in the array.
   */
  dispose(this: void): void;

  /**
   * Flush and remove all disposables, or a specific disposable.
   *
   * @param disposable The disposable to flush. Flush all if omitted.
   */
  flush(disposable?: DisposableType): void;

  /**
   * Check if a disposable exists in the array.
   *
   * @param disposable The disposable.
   * @returns `true` if exists, otherwise `false`.
   */
  has(disposable: DisposableType): boolean;

  /**
   * Invoke the executor and push the returned disposable to the array.
   *
   * @param executor A function that returns a disposable.
   * @returns The returned disposable.
   */
  make<T extends DisposableType>(executor: () => T): T;

  /**
   * Invoke the executor and push the returned disposable to the array.
   *
   * Do nothing if `null | undefined` is returned.
   *
   * @param executor A function that returns either a disposable or `null | undefined`.
   * @returns The returned disposable, or `undefined`.
   */
  make<T extends DisposableType>(
    executor: () => null | T | undefined | void
  ): T | void;

  /**
   * Invoke the executor and push each returned disposable to the array.
   *
   * @param executor A function that returns an array of disposables.
   * @returns The returned array.
   */
  make<T extends DisposableType[]>(executor: () => T): T;

  /**
   * Invoke the executor and push each returned disposable to the array.
   *
   * Do nothing if `null | undefined` is returned.
   *
   * @param executor A function that returns an array of disposables or `null | undefined`.
   * @returns The returned array, or `undefined`.
   */
  make<T extends DisposableType[]>(
    executor: () => null | T | undefined | void
  ): T | void;

  /**
   * Push a disposable to the end of the array.
   *
   * @param disposable A disposable.
   * @returns The same disposable.
   */
  push<T extends DisposableType>(disposable: T): T;

  /**
   * Push multiple disposables to the end of the array.
   *
   * @param disposables An array of disposables.
   * @returns The same array.
   */
  push<T extends DisposableType[]>(disposables: T): T;

  /**
   * Push one or more disposables to the end of the array.
   *
   * @param disposables A disposable or an array of disposables.
   * @returns The same value.
   */
  push<T extends DisposableType>(disposables: T | T[]): T | T[];

  /**
   * Remove a disposable from the array without flushing it.
   *
   * @param disposable The disposable to remove.
   * @returns `true` if removed, otherwise `false`.
   */
  remove(disposable: DisposableType): boolean;

  /**
   * Get current array size.
   */
  size(): number;
}

/**
 * Create a {@link DisposableArray} that manages disposables in array order.
 *
 * This structure is optimized for frequent `push` operations.
 *
 * @param disposables Optional initial disposables.
 * @returns A disposable array.
 */
export function disposableArray(
  disposables?: DisposableType[]
): DisposableArray {
  let isDisposing: 1 | void;
  function disposableArray(): void {
    if (!isDisposing) {
      isDisposing = 1;
      isDisposing = (disposableArray as DisposableArray)._disposables_ = (
        disposableArray as DisposableArray
      )._disposables_?.forEach(dispose);
    }
  }
  disposableArray.dispose = disposableArray;
  disposableArray.size = size;
  disposableArray.has = has;
  disposableArray.push = push;
  disposableArray.make = make;
  disposableArray.remove = remove;
  disposableArray.flush = flush;
  if (disposables) {
    disposableArray.push(disposables);
  }
  return disposableArray;
}

function _pushOne<T extends DisposableType>(
  this: DisposableArray,
  disposable: T
): void {
  (this._disposables_ ??= []).push(disposable);
  if (isAbortable(disposable)) {
    disposable.abortable(remove.bind(this, disposable));
  }
}

function push<T extends DisposableType>(
  this: DisposableArray,
  disposables: T | T[]
): T | T[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  Array.isArray(disposables)
    ? disposables.forEach(_pushOne, this)
    : _pushOne.call(this, disposables);
  return disposables;
}

function flush(this: DisposableArray, disposable?: DisposableType): void {
  dispose(disposable ? this.remove(disposable) && disposable : this);
}

function has(this: DisposableArray, disposable: DisposableType): boolean {
  return !!this._disposables_?.includes(disposable);
}

function make<T extends DisposableType>(
  this: DisposableArray,
  executor: () => null | T | T[]
): null | T | T[] {
  const disposable = executor();
  return disposable && this.push(disposable);
}

function remove(this: DisposableArray, disposable: DisposableType): boolean {
  const index = this._disposables_?.lastIndexOf(disposable) ?? -1;
  return index >= 0 && !!this._disposables_!.splice(index, 1);
}

function size(this: DisposableArray): number {
  return this._disposables_?.length || 0;
}
