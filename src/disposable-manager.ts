import type { DisposableId, DisposableType, ObjDisposable } from "./interface";

import { isAbortable } from "./abortable";
import { invokeDispose } from "./utils";

/**
 * A disposable manager that manages disposers(disposables).
 *
 * All disposers will be invoked(`flush`) when manager is disposed.
 */
export class DisposableManager implements ObjDisposable {
  private _disposables_: Map<DisposableId, DisposableType>;

  public constructor() {
    this._disposables_ = new Map();
  }

  /**
   * Get the number of disposers in the manager.
   */
  public get size(): number {
    return this._disposables_.size;
  }

  /**
   * Add a disposer to the manager.
   * @param disposable A disposer function.
   * @param id Optional id for the disposer. Adding with same id will first invoke(`flush`) the previous disposer.
   */
  public add(disposable: DisposableType, id?: DisposableId): DisposableId;
  /**
   * Add an array of disposers to the manager.
   * @param disposable
   */
  public add(disposable: DisposableType[]): void;
  public add(
    disposable: DisposableType | DisposableType[],
    id?: DisposableId
  ): DisposableId | void {
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
    return id;
  }

  /**
   * Invoke the executor function and add the returned disposer to the manager.
   * @param executor A function that returns a disposer.
   * @param id Optional id for the disposer. Adding with same id will first invoke(`flush`) the previous disposable.
   * @returns The manager id of the disposer.
   */
  public make(executor: () => DisposableType, id?: DisposableId): DisposableId;
  /**
   * Invoke the executor function. If it returns a disposer, add the disposer to the manager, otherwise do nothing.
   * @param executor A function that returns either a disposer, `null` or `false`.
   * @param id Optional id for the disposer. Adding with same id will first invoke(`flush`) the previous disposable.
   * @returns The manager id of the disposer, or `undefined` if the executor returns `null` or `false`.
   */
  public make(
    executor: () => DisposableType | null | false,
    id?: DisposableId
  ): DisposableId | void;
  /**
   * Invoke the executor function. If it returns an array of disposers, add all the disposers to the manager, otherwise do nothing.
   * @param executor A function that returns either an array of disposers, `null` or `false`.
   */
  public make(executor: () => DisposableType[] | null | false): void;
  public make(
    executor: () => DisposableType | DisposableType[] | null | false,
    id?: DisposableId
  ): DisposableId | void {
    const disposers = executor();
    if (disposers) {
      return this.add(disposers as DisposableType, id);
    }
  }

  /**
   * Check whether the manager has the disposer.
   * @param id Manager id of the disposer.
   * @returns Whether the manager has the disposer.
   */
  public has(id: DisposableId): boolean {
    return this._disposables_.has(id);
  }

  /**
   * Remove the disposer from the manager. Does not invoke the disposer.
   * @param id Manager id of the disposer.
   * @returns `true` if the disposer is removed, `false` if the disposer is not found.
   */
  public remove(id: DisposableId): boolean {
    return this._disposables_.delete(id);
  }

  /**
   * Invoke the disposer and remove it from the manager.
   * @param id Manager id of the disposer.
   */
  public flush(id: DisposableId): void {
    const disposable = this._disposables_.get(id);
    if (disposable) {
      this.remove(id);
      invokeDispose(disposable);
    }
  }

  /**
   * Invoke all disposers and clear the manager.
   */
  public dispose(): void {
    this._disposables_.forEach(invokeDispose);
    this._disposables_.clear();
  }

  private _currentId_ = 100;
  private _genId_(): number {
    while (this._disposables_.has(this._currentId_)) {
      this._currentId_ = (this._currentId_ + 1) | 0;
    }
    return this._currentId_;
  }
}
