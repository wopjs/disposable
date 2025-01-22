/**
 * A combination of {@link Disposer} and {@link IDisposable}.
 * It can be called to dispose resources or call the `dispose` method to dispose resources.
 */
export interface DisposableDisposer<T = any> {
  (): T;
  dispose(): T;
}

/**
 * A union type of {@link Disposer} and {@link IDisposable} which can be called to dispose resources.
 */
export type DisposableType<T = any> = Disposer<T> | IDisposable<T>;

/**
 * A function that can be called to dispose resources.
 */
export type Disposer<T = any> = () => T;

/**
 * An object that has a `dispose` method to dispose resources.
 */
export interface IDisposable<T = any> {
  dispose(): T;
}
