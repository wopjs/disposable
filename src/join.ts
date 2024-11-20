import type { DisposableType, Disposer } from "./interface";

import { dispose } from "./utils";

export const join =
  (...disposers: DisposableType[]): Disposer =>
  () =>
    disposers.forEach(dispose);
