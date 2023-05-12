import type { DisposableType, Disposer, IDisposable } from "./interface";

export const invoke = <T>(fn: () => T): T | void => {
  try {
    return fn();
  } catch (e) {
    console.error(e);
  }
};

export const invokeDispose = <T>(disposable: DisposableType): T | void =>
  invoke((disposable as IDisposable).dispose || (disposable as Disposer));
