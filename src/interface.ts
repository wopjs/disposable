export type DisposableId = number | string;

/**
 * A function form of disposable.
 * It that can be called to dispose resources.
 */
export type Disposer = () => any;

/**
 * An object form of disposable.
 * It has a `dispose` method to dispose resources.
 */
export interface IDisposable {
  dispose(): any;
}

/**
 * A union type of `Disposer` and `IDisposable` which can be called to dispose resources.
 */
export type DisposableType = Disposer | IDisposable;

/**
 * A combination of `Disposer` and `Disposable`.
 * It can be called to dispose resources or call the `dispose` method to dispose resources.
 */
export interface DisposableDisposer {
  (): any;
  dispose(): any;
}
