import wopjs, { defineConfig } from "@wopjs/eslint-config";

import disposable from "./eslint-plugin.js";

export default defineConfig(...wopjs, disposable.recommended, {
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
});
