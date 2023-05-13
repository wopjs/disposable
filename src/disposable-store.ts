import type {
  DisposableId,
  DisposableType,
  IDisposable,
  DisposableKey,
} from "./interface";

import { isAbortable } from "./abortable";
import { invokeDispose } from "./utils";

/**
 * A disposable store that manages disposers(disposables).
 *
 * All disposers will be invoked(`flush`) when store is disposed.
 */
export class DisposableStore implements IDisposable {
  private _disposables_: Map<DisposableKey, DisposableType>;
  private _ids_?: WeakMap<DisposableType, DisposableId>;

  public constructor() {
    this._disposables_ = new Map();
  }

  /**
   * Get the number of disposers in the store.
   */
  public get size(): number {
    return this._disposables_.size;
  }

  /**
   * Add a disposer to the store.
   * @param disposable A disposer function.
   * @param id Optional id for the disposer. Adding with same id will first invoke(`flush`) the previous disposer.
   * @returns The same disposer.
   */
  public add<T extends DisposableType>(disposable: T, id?: DisposableId): T;
  /**
   * Add an array of disposers to the store.
   * @param disposables An array of disposables.
   * @returns The same array of disposables.
   */
  public add<T extends DisposableType[]>(disposables: T): T;
  public add<T extends DisposableType>(
    disposable: T | T[],
    id?: DisposableId
  ): T | T[] | void {
    if (Array.isArray(disposable)) {
      for (const d of disposable) {
        this.add(d);
      }
      return disposable;
    }

    this.flush(disposable);

    let disposableId: DisposableKey = disposable;
    if (id != null) {
      // flush before setting id to WeakMap
      this.flush(id);
      disposableId = id;
      (this._ids_ || (this._ids_ = new WeakMap())).set(disposable, id);
    }
    this._disposables_.set(disposableId, disposable);
    if (isAbortable(disposable)) {
      disposable.abortable(() => this.remove(disposableId));
    }
    return disposable;
  }

  /**
   * Invoke the executor function and add the returned disposer to the store.
   * @param executor A function that returns a disposer.
   * @param id Optional id for the disposer. Adding with same id will first invoke(`flush`) the previous disposable.
   * @returns The returned disposable.
   */
  public make<T extends DisposableType>(
    executor: () => T,
    id?: DisposableId
  ): T;
  /**
   * Invoke the executor function. If it returns a disposer, add the disposer to the store, otherwise do nothing.
   * @param executor A function that returns either a disposer or `null`.
   * @param id Optional id for the disposer. Adding with same id will first invoke(`flush`) the previous disposable.
   * @returns The returned disposer, or `undefined` if the executor returns `null`.
   */
  public make<T extends DisposableType>(
    executor: () => T | null,
    id?: DisposableId
  ): T | void;
  /**
   * Invoke the executor function. If it returns an array of disposers, add all the disposers to the store, otherwise do nothing.
   * @param executor A function that returns either an array of disposers.
   * @returns The returned array of disposers.
   */
  public make<T extends DisposableType[]>(executor: () => T): T;
  /**
   * Invoke the executor function. If it returns an array of disposers, add all the disposers to the store, otherwise do nothing.
   * @param executor A function that returns either an array of disposers or `null`.
   * @param The returned array of disposers, or `undefined` if the executor returns `null`.
   */
  public make<T extends DisposableType[]>(executor: () => T | null): T | void;
  public make<T extends DisposableType>(
    executor: () => T | T[] | null,
    id?: DisposableId
  ): T | void {
    const disposers = executor();
    if (disposers) {
      return this.add(disposers as T, id);
    }
  }

  /**
   * Check whether the store has the disposer.
   * @param key disposer function or store id of the disposer.
   * @returns Whether the store has the disposer.
   */
  public has(key: DisposableKey): boolean {
    return this._disposables_.has(this._getId_(key));
  }

  /**
   * Check whether the store has the disposer.
   * @param key disposer function or store id of the disposer.
   * @returns Whether the store has the disposer.
   */
  public get<T extends DisposableType = DisposableType>(
    key: DisposableKey
  ): T | undefined {
    return this._disposables_.get(this._getId_(key)) as T | undefined;
  }

  /**
   * Remove the disposer from the store. Does not invoke the disposer.
   * @param key disposer function or store id of the disposer.
   * @returns `true` if the disposer is removed, `false` if the disposer is not found.
   */
  public remove(key: DisposableKey): boolean {
    return this._disposables_.delete(this._getId_(key));
  }

  /**
   * Invoke the disposer and remove it from the store.
   * @param key disposer function or store id of the disposer.
   */
  public flush(key: DisposableKey): void {
    const id = this._getId_(key);
    const disposable = this._disposables_.get(id);
    if (disposable) {
      this._disposables_.delete(id);
      invokeDispose(disposable);
    }
  }

  /**
   * Invoke all disposers and clear the store.
   */
  public dispose(): void {
    this._disposables_.forEach(invokeDispose);
    this._disposables_.clear();
  }

  private _getId_(key: DisposableKey): DisposableKey {
    const id = this._ids_ && this._ids_.get(key as DisposableType);
    return id == null ? key : id;
  }
}
