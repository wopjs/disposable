import type { DisposableType, Disposer, IDisposable } from "./interface";

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

export const invokeDispose = (disposable: DisposableType): void => {
  try {
    if ((disposable as IDisposable).dispose) {
      (disposable as IDisposable).dispose();
    } else {
      (disposable as Disposer)();
    }
  } catch (e) {
    console.error(e);
  }
};
