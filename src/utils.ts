import {
  type DisposableType,
  type Disposer,
  type IDisposable,
} from "./interface";

export const isFn = (value: any): value is (...args: any[]) => any =>
  !!(value && value.constructor && value.call && value.apply);

/**
 * Check if a value is a {@link DisposableType}.
 * @param value The value to check.
 * @returns True if the value is a {@link DisposableType}, false otherwise.
 */
export const isDisposable = (value: any): value is DisposableType =>
  isFn(value as Disposer) || isFn((value as IDisposable)?.dispose);

/**
 * Join multiple disposables into a single disposer function.
 * @param disposables The disposables to join.
 * @returns A disposer function that disposes all the given disposables when called.
 */
export const join = (...disposables: DisposableType[]): Disposer =>
  disposables.forEach.bind(disposables, dispose);

/**
 * Dispose a disposable object or a disposer function. Log the error if any.
 * @param disposable A disposable object or a disposer function. Do nothing otherwise.
 */
export function dispose(disposable: any): void {
  try {
    if (disposable) {
      if (isFn((disposable as IDisposable).dispose)) {
        // isDisposableObject
        (disposable as IDisposable).dispose();
      } else if (isFn(disposable)) {
        // isFunction
        (disposable as Disposer)();
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Extend {@link IDisposable.dispose} with more disposables. The new disposables will be disposed after the original one.
 *
 * @param disposable The original {@link IDisposable}.
 * @param disposables Additional {@link DisposableType}s to be disposed after the original one.
 * @returns The original {@link IDisposable} with extended `dispose` method.
 *
 * @example
 * ```ts
 * import { extend, type IDisposable } from "@wopjs/disposable";
 *
 * const disposable: IDisposable = {
 *  dispose: () => console.log("original dispose"),
 * };
 *
 * extend(disposable, () => console.log("extended dispose 1"), () => console.log("extended dispose 2"));
 */
export function extend<T extends IDisposable>(
  disposable: T,
  ...disposables: DisposableType[]
): T {
  const oldDispose = disposable.dispose.bind(disposable);
  disposable.dispose = join(oldDispose, ...disposables);
  return disposable;
}
