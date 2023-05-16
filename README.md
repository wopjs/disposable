# @wopjs/disposable

<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/wopjs/disposable/main/assets/disposable.svg">
</p>

[![Docs](https://img.shields.io/badge/Docs-read-%23fdf9f5)](https://wopjs.github.io/disposable)
[![Build Status](https://github.com/wopjs/disposable/actions/workflows/build.yml/badge.svg)](https://github.com/wopjs/disposable/actions/workflows/build.yml)
[![Coverage Status](https://img.shields.io/codeclimate/coverage/wopjs/disposable)](https://codeclimate.com/github/wopjs/disposable)
[![npm-version](https://img.shields.io/npm/v/@wopjs/disposable.svg)](https://www.npmjs.com/package/@wopjs/disposable)
[![minified-size](https://img.shields.io/bundlephobia/minzip/@wopjs/disposable)](https://bundlephobia.com/package/@wopjs/disposable)
[![tree-shakable](https://img.shields.io/badge/tree-shakable-success)](https://bundlejs.com/?q=@wopjs/disposable)
[![no-dependencies](https://img.shields.io/badge/dependencies-none-success)](https://bundlejs.com/?q=@wopjs/disposable)
[![side-effect-free](https://img.shields.io/badge/side--effect-free-success)](https://bundlejs.com/?q=@wopjs/disposable)

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?maxAge=2592000)](http://commitizen.github.io/cz-cli/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-brightgreen.svg?maxAge=2592000)](https://conventionalcommits.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Manage side effect disposers in a compact, reusable and testable style. Designed and implemented with efficiency and ergonomics in mind.

## Install

```
npm add @wopjs/disposable
```

## Examples

```ts
import {
  disposable,
  type IDisposable,
  type DisposableStore,
} from "@wopjs/disposable";

class A implements IDisposable {
  dispose: DisposableStore;
  constructor() {
    this.dispose = disposable();
    // Add a disposer function via `add`.
    this.dispose.add(
      someEvent.addListener("type", event => console.log(event))
    );
  }
  someMethod() {
    // Create side effects on demand.
    this.dispose.make(
      () => {
        const timeoutId = setTimeout(() => console.log("timeout"), 1000);
        return () => clearTimeout(timeoutId);
      },
      // Easily implements debounce by providing a id for the disposer.
      // When adding disposer with the same id to the store, the previous disposer will be disposed.
      "myIdForThisDebounce"
    );
  }
}

class B implements IDisposable {
  dispose: DisposableStore;
  a = new A();
  constructor() {
    // Add initial disposables.
    this.dispose = disposable([
      // A is a disposable so it can be added to the store.
      a,
      // Add a disposer function.
      someEvent.addListener("type", event => console.log(event)),
    ]);
  }
}

const b = new B();
b.dispose(); // All side effects in both a and b are disposed
```

If you prefer less type annotation and more auto type inference:

```ts
import { disposable } from "@wopjs/disposable";

class A {
  dispose = disposable();
  constructor() {
    this.dispose.add(() => console.log("a"));
  }
  print() {
    console.log("print a");
  }
}

class B {
  dispose = disposable();
  // A is a disposable so it can be added to the store.
  a = this.dispose.add(new A());
}

const b = new B();
b.a.print(); // "print a"
b.dispose(); // both a and b are disposed
```

## Features

### Non-invasive

- Disposable adopts both disposer function `() => any` and `.disposer()` contracts which are widely accepted. Implementing these patterns does not require any extra effort.

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
  import { disposable, type IDisposable } from "@wopjs/disposable";

  class A implements IDisposable {
    dispose = disposable();
    constructor() {
      this.dispose.add(() => console.log("a"));
    }
    print() {
      console.log("print a");
    }
  }

  class B implements IDisposable {
    dispose = disposable();
    a = this.dispose.add(new A());
  }

  const b = new B();
  b.a.print(); // "print a"
  b.dispose(); // both a and b are disposed
  ```

- You can also create your own side effects in a compact way.

  ```js
  import { disposable } from "@wopjs/disposable";

  class A {
    dispose = disposable();
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

- Disposables can use id as key when adding to the store. Adding a disposable with the same id will dispose (flush) the old one first.

  ```js
  import { disposable } from "@wopjs/disposable";
  import { addEventListener } from "@wopjs/dom";
  import { timeout } from "@wopjs/time";

  const dispose = disposable();
  dispose.add(
    addEventListener(window, "click", event => {
      // Clicking within 1s will trigger debounce effect (the pending timeout is cancelled before adding the new one).
      dispose.add(
        timeout(() => console.log(event), 1000),
        "myId"
      );
    })
  );
  ```

### Small Footprint

- Designed and implemented with efficiency and ergonomics in mind, not only the (minified) bundle size is less than 1kb, using this library also enables patterns that require way less code to manage side effect disposers.

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

### DisposableStore

A disposable store is a disposable that manages disposers and disposables.

```js
import { disposable } from "@wopjs/disposable";

const store = disposable();
store.add(() => console.log("disposer"));
store.make(() => {
  return () => console.log("disposable");
});
store.dispose(); // Logs "disposer" and "disposable"
```

It is also a disposer! Which means it can be easily composed with other disposables.

```js
import { disposable, type IDisposable } from "@wopjs/disposable";

class A implements IDisposable {
  dispose = disposable();
  constructor() {
    this.dispose.add(() => console.log("a"));
  }
  print() {
    console.log("print a");
  }
}

class B implements IDisposable {
  dispose = disposable();
  a = this.dispose.add(new A());
}

const b = new B();
b.a.print(); // "print a"
b.dispose(); // both a and b are disposed
```

### DisposableDisposer

A disposable disposer is both a disposer an a disposable.

This pattern is useful for library authors who want to create disposers that are compatible to the majority of frameworks.

```js
const addListener = (target, type, listener) => {
  target.addEventListener(type, listener);
  const disposer = () => target.removeEventListener(type, listener);
  disposer.dispose = disposer;
  return disposer;
};

const dispose = disposable();
dispose.add(addListener(window, "click"));
```

To make it easier to work with TypeScript, `makeDisposable` is provided to create a disposable disposer.

```ts
import { makeDisposable } from "@wopjs/disposable";

const addListener = (target, type, listener) => {
  target.addEventListener(type, listener);
  return makeDisposable(() => target.removeEventListener(type, listener));
};
```

## Abortable

Abortable is a special kind of disposable that may be disposed outside of the store (like when `setTimeout` or `once` event finishes). It will notify the store to delete itself from the store when disposed. The signature is the same as a disposable disposer.

```js
const timeout = (handle, timeout) => {
  let id;
  const disposer = abortable(() => clearTimeout(id));
  id = setTimeout(() => {
    handler();
    disposer();
  }, timeout);
  return disposer;
};

const dispose = disposable();
dispose.add(timeout(() => console.log("timeout"), 1000));

// The `timeout` disposer will be removed from the `dispose` after 1s.
```

## License

MIT @ [wopjs](https://github.com/wopjs)
