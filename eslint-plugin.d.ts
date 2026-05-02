import type { ESLint, Linter } from "eslint";

export declare const plugin: ESLint.Plugin;
export declare const recommended: Linter.Config;

declare const exports: { plugin: typeof plugin; recommended: typeof recommended };

export default exports;
