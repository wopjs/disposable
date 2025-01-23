// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
import { type DisposableStore } from "./disposable-store";
import {
  type DisposableDisposer,
  type DisposableType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
  type Disposer,
} from "./interface";
import { dispose, isDisposable, isFn } from "./utils";

/**
 * A {@link DisposableDisposer} that can be safely self-disposed.
 * If it is attached to a {@link DisposableStore}, it will be removed from the store automatically when self-disposed.
 */
interface AbortableDisposable {
  (): any;
  abortable: (onDispose: () => void) => void;
  dispose: (this: void) => any;
}

interface AbortableDisposableImpl extends AbortableDisposable {
  /** deps */
  _o?: (() => any) | null | void;
  abortable: (onDispose?: () => void) => void;
}

/**
 * Enhance a {@link Disposer} so that it can be safely self-disposed.
 *
 * If it is attached to a {@link DisposableStore}, it will be removed from the store automatically when self-disposed.
 *
 * @param disposer A {@link Disposer}.
 * @returns An abortable {@link DisposableDisposer}.
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
export const abortable: (disposable: DisposableType) => DisposableDisposer = (
  disposable: DisposableType | void
): DisposableDisposer => {
  const abortable: AbortableDisposableImpl = (): void => {
    abortable.abortable();
    disposable = dispose(disposable);
  };
  abortable.dispose = abortable;
  abortable.abortable = abortable$abortable;
  return abortable;
};

function abortable$abortable(
  this: AbortableDisposableImpl,
  onDispose?: () => void
): void {
  dispose(this?._o);
  this._o = onDispose;
}

export const isAbortable = (
  disposable: any
): disposable is AbortableDisposable =>
  isDisposable(disposable) &&
  isFn((disposable as AbortableDisposable).abortable);
