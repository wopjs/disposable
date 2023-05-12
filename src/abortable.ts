import type { Disposable } from "./interface";

import { invoke } from "./utils";

/**
 * A disposable that can be safely self-disposed.
 * If it is attached to a disposable store, it will be removed from the store automatically when self-disposed.
 */
export interface AbortableDisposable {
  (): any;
  dispose: () => any;
  abortable: (onDispose: () => void) => void;
}

interface AbortableDisposableImpl extends AbortableDisposable {
  /** disposer */
  _d?: (() => any) | null;
  /** onDisposer */
  _o?: (() => any) | null;
}

/**
 * Enhance a disposer so that it can be safely self-disposed.
 *
 * If the enhanced disposable is attached to a disposable store, it will be removed from the store automatically when self-disposed.
 *
 * @param disposer The disposer to be called when the disposable is disposed.
 * @returns An abortable disposable.
 *
 * @example
 * ```js
 * let timeoutId;
 * const disposer = abortable(() => clearTimeout(timeoutId));
 * timeoutId = setTimeout(() => console.log("hello"), 1000);
 *
 * // Add to a store
 * const disposable = new DisposableStore();
 * disposable.add(disposer);
 *
 * // Self-dispose
 * disposer(); // setTimeout is cleared and the disposer is removed from the store.
 * ```
 */
export const abortable = (disposer: () => any): Disposable => {
  const abortable: AbortableDisposableImpl = (): void => {
    if (abortable._d) {
      invoke(abortable._d);
      abortable._d = null;
    }

    if (abortable._o) {
      invoke(abortable._o);
      abortable._o = null;
    }
  };
  abortable.dispose = abortable;
  abortable._d = disposer;
  abortable.abortable = bindOnDispose;
  return abortable;
};

function bindOnDispose(
  this: AbortableDisposableImpl,
  onDispose: () => void
): void {
  this._o = onDispose;
}

export const isAbortable = (
  disposable: any
): disposable is AbortableDisposable =>
  disposable.disposable && disposable.abort;
