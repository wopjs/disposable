import { type Disposer, type IDisposable } from "./interface";

export const isFn = (value: any): value is (...args: any[]) => any =>
  !!(value && value.constructor && value.call && value.apply);

/**
 * Dispose a disposable object or a disposer function. Log the error if any.
 * @param disposable A disposable object or a disposer function. Do nothing otherwise.
 */
export function dispose(disposable: unknown): void {
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
