import type { DisposableType, FnDisposable, ObjDisposable } from "./interface";

export const invoke = <T>(fn: () => T): T | void => {
  try {
    return fn();
  } catch (e) {
    console.error(e);
  }
};

export const invokeDispose = <T>(disposable: DisposableType): T | void =>
  invoke((disposable as ObjDisposable).dispose || (disposable as FnDisposable));
