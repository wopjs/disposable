export type DisposableId = number | string;

/**
 * A function form of disposable.
 * It that can be called to dispose resources.
 */
export interface FnDisposable {
  (): any;
}

/**
 * An object form of disposable.
 * It has a `dispose` method to dispose resources.
 */
export interface ObjDisposable {
  dispose(): any;
}

/**
 * A union type of `FnDisposable` and `ObjDisposable`.
 */
export type DisposableType = FnDisposable | ObjDisposable;

/**
 * A combination of `FnDisposable` and `ObjDisposable`.
 * It can be called to dispose resources or call the `dispose` method to dispose resources.
 */
export interface Disposable {
  (): any;
  dispose(): any;
}
