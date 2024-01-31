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

export const invoke = (fn: () => any, self: any): void => {
  try {
    fn.call(self);
  } catch (e) {
    console.error(e);
  }
};

export const invokeDispose = (disposable: DisposableType): void =>
  invoke(
    (disposable as IDisposable).dispose || (disposable as Disposer),
    disposable
  );
