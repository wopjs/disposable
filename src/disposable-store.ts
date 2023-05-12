import type { DisposableId, DisposableType, ObjDisposable } from "./interface";

import { isAbortable } from "./abortable";
import { invokeDispose } from "./utils";

/**
 * A disposable store that manages disposers(disposables).
 *
 * All disposers will be invoked(`flush`) when store is disposed.
 */
export class DisposableStore implements ObjDisposable {
  private _disposables_: Map<DisposableId, DisposableType>;

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
   * @param disposable
   */
  public add(disposable: DisposableType[]): void;
  public add<T extends DisposableType>(
    disposable: T | T[],
    id?: DisposableId
  ): T | void {
    if (Array.isArray(disposable)) {
      for (const d of disposable) {
        this.add(d);
      }
      return;
    }

    if (id == null) {
      id = this._genId_();
    } else {
      this.flush(id);
    }
    this._disposables_.set(id, disposable);
    if (isAbortable(disposable)) {
      disposable.abortable(() => this.remove(id as DisposableId));
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
   * @param executor A function that returns either a disposer, `null` or `false`.
   * @param id Optional id for the disposer. Adding with same id will first invoke(`flush`) the previous disposable.
   * @returns The returned disposer, or `undefined` if the executor returns `null` or `false`.
   */
  public make<T extends DisposableType>(
    executor: () => T | null | false,
    id?: DisposableId
  ): T | void;
  /**
   * Invoke the executor function. If it returns an array of disposers, add all the disposers to the store, otherwise do nothing.
   * @param executor A function that returns either an array of disposers, `null` or `false`.
   */
  public make(executor: () => DisposableType[] | null | false): void;
  public make<T extends DisposableType>(
    executor: () => T | T[] | null | false,
    id?: DisposableId
  ): T | void {
    const disposers = executor();
    if (disposers) {
      return this.add(disposers as T, id);
    }
  }

  /**
   * Check whether the store has the disposer.
   * @param id store id of the disposer.
   * @returns Whether the store has the disposer.
   */
  public has(id: DisposableId): boolean {
    return this._disposables_.has(id);
  }

  /**
   * Remove the disposer from the store. Does not invoke the disposer.
   * @param id store id of the disposer.
   * @returns `true` if the disposer is removed, `false` if the disposer is not found.
   */
  public remove(id: DisposableId): boolean {
    return this._disposables_.delete(id);
  }

  /**
   * Invoke the disposer and remove it from the store.
   * @param id store id of the disposer.
   */
  public flush(id: DisposableId): void {
    const disposable = this._disposables_.get(id);
    if (disposable) {
      this.remove(id);
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

  private _currentId_ = 0;
  private _genId_(): number {
    while (this._disposables_.has(this._currentId_)) {
      this._currentId_ = (this._currentId_ + 1) | 0;
    }
    return this._currentId_;
  }
}
