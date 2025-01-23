import { type TSESLint } from "@typescript-eslint/utils";
import { type ESLint } from "eslint";

declare const exports: {
  plugin: ESLint.Plugin;
  recommended: TSESLint.FlatConfig.Config;
};

export default exports;
