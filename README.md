# @wopjs/disposable

<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/wopjs/disposable/main/assets/disposable.svg">
</p>

[![Docs](https://img.shields.io/badge/Docs-read-%23fdf9f5)](https://wopjs.github.io/disposable)
[![Build Status](https://github.com/wopjs/disposable/actions/workflows/build.yml/badge.svg)](https://github.com/wopjs/disposable/actions/workflows/build.yml)
[![npm-version](https://img.shields.io/npm/v/@wopjs/disposable.svg)](https://www.npmjs.com/package/@wopjs/disposable)
[![Coverage Status](https://img.shields.io/coverallsCoverage/github/wopjs/disposable)](https://coveralls.io/github/wopjs/disposable)
[![minified-size](https://img.shields.io/bundlephobia/minzip/@wopjs/disposable)](https://bundlephobia.com/package/@wopjs/disposable)
[![core-size](https://img.shields.io/bundlejs/size/%40wopjs%2Fdisposable?exports=disposableStore&label=core%20size)](https://bundlejs.com/?q=@wopjs/disposable&treeshake=%5B%7BdisposableStore%7D%5D)

Manage side effect disposers in a compact, reusable and testable style. Designed and implemented with efficiency and ergonomics in mind.

## Install

```
npm add @wopjs/disposable
```

## Examples

```ts
import { disposableStore } from "@wopjs/disposable";

// Example lib that returns a disposer function
const listen = (target, type, listener) => {
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
};

class A {
  dispose = disposableStore();
  constructor() {
    this.dispose.add(listen("type", event => console.log(event)));
  }
  print() {
    console.log("print a");
  }
}

class B {
  dispose = disposableStore();
  // A is a disposable so it can be added to the store.
  a = this.dispose.add(new A());
}

const b = new B();
b.a.print(); // "print a"
b.dispose(); // both a and b are disposed
```

With more type annotations:

```ts
import {
  disposableStore,
  disposableMap,
  type IDisposable,
  type DisposableStore,
} from "@wopjs/disposable";

// Example lib that returns a disposer function
const listen = (target, type, listener) => {
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
};

class A implements IDisposable {
  dispose = disposableMap();
  someMethod() {
    // Create side effects on demand.
    this.dispose.make(
      // Easily implements debounce by providing a id for the disposer.
      // When adding disposer with the same id to the store, the previous disposer will be disposed.
      "myIdForThisDebounce",
      () => {
        const timeoutId = setTimeout(() => console.log("timeout"), 1000);
        return () => clearTimeout(timeoutId);
      }
    );
  }
}

class B implements IDisposable {
  dispose: DisposableStore;
  a = new A();
  constructor() {
    // Add initial disposables.
    this.dispose = disposableStore([
      // A is a disposable so it can be added to the store.
      a,
      // Add a disposer function.
      listen("type", event => console.log(event)),
    ]);
  }
}

const b = new B();
b.dispose(); // All side effects in both a and b are disposed
```

## Features

### Non-invasive

- Disposable adopts both disposer function `() => void` and disposable `.dispose()` contracts which are widely accepted. Implementing these patterns does not require any extra effort.

  ```js
  // disposer function pattern
  const disposer = () => console.log("dispose");

  // class disposable pattern
  class MyDisposable {
    dispose() {
      console.log("dispose");
    }
  }
  const myDisposable = new MyDisposable();

  // plain object disposable pattern
  const myDisposable = {
    dispose() {
      console.log("dispose");
    },
  };
  ```

- And of course it works well with other `@wopjs` libraries.
  ```js
  import { addEventListener } from "wopjs/dom";
  import { timeout } from "wopjs/time";
  ```

### Compact

- Disposables are designed to be composable and chainable.

  ```ts
  import { disposableStore, type IDisposable } from "@wopjs/disposable";

  class A implements IDisposable {
    dispose = disposableStore();
    constructor() {
      this.dispose.add(() => console.log("a"));
    }
    print() {
      console.log("print a");
    }
  }

  class B implements IDisposable {
    dispose = disposableStore();
    a = this.dispose.add(new A());
  }

  const b = new B();
  b.a.print(); // "print a"
  b.dispose(); // both a and b are disposed
  ```

- You can also create your own side effects in a compact way.

  ```js
  import { disposableStore } from "@wopjs/disposable";

  class A {
    dispose = disposableStore();
    constructor() {
      dispose.make(() => {
        const handler = () => console.log("click");
        someEvent.on("type", handler);
        return () => someEvent.off("type", handler);
      });
    }
  }

  const a = new A();
  a.dispose(); // clear all disposers
  ```

### Refresh-able

- Disposables can bind to keys with `DisposableMap`. Setting a disposable with the same key will dispose (flush) the old one first.

  ```js
  import { disposableStore, disposableMap } from "@wopjs/disposable";
  import { addEventListener } from "@wopjs/dom";
  import { timeout } from "@wopjs/time";

  const store = disposableStore();
  // let store also manage the DisposableMap
  const map = store.add(disposableMap());

  store.add(
    addEventListener(window, "click", event => {
      // Clicking within 1s will trigger debounce effect (the pending timeout is cancelled before adding the new one).
      map.set(
        "myId",
        timeout(() => console.log(event), 1000)
      );
    })
  );
  ```

### Small Footprint

- Designed and implemented with efficiency and ergonomics in mind, not only the (minified) bundle size is less than 1kb, using this library also enables patterns that require way less code to manage side effect disposers and module life-cycles.

## Concepts

### Disposable

A disposable is an object that has a `dispose` method. The `dispose` method is used to dispose the object, which means to clean up any resources it holds.

```js
// class disposable
class MyDisposable {
  dispose() {
    console.log("clean up");
  }
}
const myDisposable = new MyDisposable();

// plain object disposable
const myDisposable = {
  dispose() {
    console.log("clean up");
  },
};
```

### Disposer

A disposer is a function that cleans up resources. It is usually created by a factory function.

```js
const addListener = (target, type, listener) => {
  target.addEventListener(type, listener);
  // disposer function
  return () => target.removeEventListener(type, listener);
};

const disposer = addListener(window, "click", () => console.log("click"));

disposer(); // listener is removed
```

### DisposableDisposer

A disposable disposer is both a disposer an a disposable.

This pattern is useful if you want to create disposers that are compatible to more frameworks.

```js
const addListener = (target, type, listener) => {
  target.addEventListener(type, listener);
  const disposer = () => target.removeEventListener(type, listener);
  disposer.dispose = disposer;
  return disposer;
};
```

For type annotation you may use `DisposableDisposer`:

```ts
import type { DisposableDisposer } from "@wopjs/disposable";

const setInterval = (handler: () => void, timeout: number) => {
  const ticket = setInterval(handler, timeout);
  const disposer: DisposableDisposer = () => clearInterval(ticket);
  disposer.dispose = disposer;
  return disposer;
};
```

### DisposableStore

A DisposableStore is a [DisposableDisposer](#DisposableDisposer) that manages other disposers and disposables.

```js
import { disposableStore } from "@wopjs/disposable";

const dispose = disposableStore();
dispose.add(() => console.log("disposed 1"));
dispose.add(() => console.log("disposed 2"));
dispose.make(() => {
  return () => console.log("disposed 3");
});
dispose(); // Logs "dispose 1", "dispose 2" and "dispose 3"
```

Since it is also a disposer, it can be easily composed with other disposables.

```ts
import { disposableStore, type IDisposable } from "@wopjs/disposable";

class A implements IDisposable {
  dispose = disposableStore();
  constructor() {
    this.dispose.add(() => console.log("a"));
  }
  print() {
    console.log("print a");
  }
}

class B implements IDisposable {
  dispose = disposableStore();
  a = this.dispose.add(new A());
}

const b = new B();
b.a.print(); // "print a"
b.dispose(); // both a and b are disposed
```

### DisposableMap

Like [DisposableStore](#disposablestore), a DisposableMap is a [DisposableDisposer](#DisposableDisposer) that manages disposers and disposables with key.

Map key introduces [Refresh-able](#refresh-able) which makes it more interesting when comes to creating side effects on the fly.

```js
import { disposableMap } from "@wopjs/disposable";

const dispose = disposableMap();
dispose.set("key1", () => console.log("disposed 1"));
dispose.make("key2", () => {
  return () => console.log("disposed 2");
});
dispose(); // Logs "disposed 1" and "disposed 2"
```

Since it is also a disposer, it can be easily composed with other disposables.

```ts
import {
  disposableMap,
  disposableStore,
  type IDisposable,
} from "@wopjs/disposable";

class A implements IDisposable {
  dispose = disposableMap();
  constructor() {
    this.dispose.add("key1", () => console.log("a"));
  }
  print() {
    console.log("print a");
  }
}

class B implements IDisposable {
  dispose = disposableStore();
  a = this.dispose.add(new A());
}

const b = new B();
b.a.print(); // "print a"
b.dispose(); // both a and b are disposed
```

### DisposableOne

DisposableOne is a lightweight [DisposableMap](#DisposableMap). It only manages one disposer or disposable at a time. It is useful if you want [Refresh-able](#refresh-able) but only need to manage one disposer or disposable.

```js
import { disposableOne } from "@wopjs/disposable";

const dispose = disposableOne();

dispose.set(() => console.log("disposed 1"));

dispose.set(() => console.log("disposed 2")); // Logs "disposed 1"

dispose(); // Logs "disposed 2"
```

### Abortable

Abortable is a special kind of disposable that may be disposed outside of the store (like when `setTimeout` or `once` event finishes). It will notify the store to delete itself from the store when disposed. The signature is the same as a disposable disposer.

```js
import { abortable, disposableStore } from "@wopjs/disposable";

const timeout = (handle, timeout) => {
  let id;
  const disposer = abortable(() => clearTimeout(id));
  id = setTimeout(() => {
    handler();
    disposer();
  }, timeout);
  return disposer;
};

const dispose = disposableStore();
dispose.add(timeout(() => console.log("timeout"), 1000));

// The `timeout` disposer will be removed from the `dispose` after 1s.
```

## Eslint Plugin

This package comes with a eslint plugin:

```
// eslint.config.mjs
import disposable from "@wopjs/disposable/eslint-plugin.js";

export default [
  disposable.recommended
]
```

Rules:

- `disposable/readonly-dispose`: Enforce `dispose` method to be `readonly`.

## License

MIT @ [wopjs](https://github.com/wopjs)
