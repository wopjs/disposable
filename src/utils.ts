import type { Disposer, IDisposable } from "./interface";

/**
 * Dispose a disposable object or a disposer function. Log the error if any.
 * @param disposable A disposable object or a disposer function. Do nothing otherwise.
 */
export function dispose(disposable: any): void {
  try {
    if (disposable) {
      if ((disposable as IDisposable).dispose) {
        // isDisposableObject
        (disposable as IDisposable).dispose();
      } else if (
        disposable.constructor &&
        disposable.call &&
        disposable.apply
      ) {
        // isFunction
        (disposable as Disposer)();
      }
    }
  } catch (e) {
    console.error(e);
  }
}
