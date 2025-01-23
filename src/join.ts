import { type DisposableType, type Disposer } from "./interface";
import { dispose } from "./utils";

export const join = (...disposers: DisposableType[]): Disposer =>
  disposers.forEach.bind(disposers, dispose);
