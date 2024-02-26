import type { Disposer, IDisposable } from "./interface";

export type PickMethods<T> = Pick<
  T,
  {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function ? K : never;
  }[keyof T]
>;

export type OmitMethods<T> = Pick<
  T,
  {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function ? never : K;
  }[keyof T]
>;

/**
 * Dispose a disposable object or a disposer function. Log the error if any.
 * @param disposable A disposable object or a disposer function. Do nothing otherwise.
 */
export const dispose = (disposable: any): void => {
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
};
