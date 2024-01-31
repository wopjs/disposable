// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
import type { DisposableStore } from "./disposable-store";
import type {
  DisposableDisposer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in type doc
  Disposer,
} from "./interface";

/**
 * A {@link DisposableDisposer} that can be safely self-disposed.
 * If it is attached to a {@link DisposableStore}, it will be removed from the store automatically when self-disposed.
 */
interface AbortableDisposable {
  (): any;
  dispose: (this: void) => any;
  abortable: (onDispose?: () => void) => void;
}

interface AbortableDisposableImpl extends AbortableDisposable {
  /** onDisposer */
  _o?: (() => any) | null;
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
export const abortable: (disposer: () => any) => DisposableDisposer = (
  disposer: (() => any) | null
): DisposableDisposer => {
  const abortable: AbortableDisposableImpl = (): void => {
    abortable.abortable();
    if (disposer) {
      disposer();
      disposer = null;
    }
  };
  abortable.dispose = abortable;
  abortable.abortable = abortable$abortable;
  return abortable;
};

function abortable$abortable(
  this: AbortableDisposableImpl,
  onDispose?: () => void
): void {
  if (this._o) {
    try {
      this._o();
    } catch (e) {
      console.error(e);
    }
  }
  this._o = onDispose;
}

export const isAbortable = (
  disposable: any
): disposable is AbortableDisposable => disposable && disposable.abortable;
