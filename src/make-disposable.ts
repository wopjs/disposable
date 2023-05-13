import type { DisposableDisposer, Disposer } from "./interface";

/**
 * Make a disposer disposable
 * @param disposer A disposer function.
 * @returns A disposable disposer function.
 */
export const makeDisposable = <T = any>(
  disposer: Disposer<T>
): DisposableDisposer<T> =>
  ((disposer as DisposableDisposer).dispose = disposer as DisposableDisposer);
