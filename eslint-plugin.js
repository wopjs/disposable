export const plugin = {
  meta: {
    name: "eslint-plugin-disposable",
  },
  rules: {
    "readonly-dispose": {
      create(context) {
        function checkProperty(node) {
          context.report({
            fix(fixer) {
              return fixer.insertTextBefore(node, "readonly ");
            },
            message: `Use readonly for Disposable to avoid leaks through accidental reassignment.`,
            node,
          });
        }

        return {
          "PropertyDefinition[readonly!=true][key.name=dispose][typeAnnotation.typeAnnotation.typeName.name=/Disposer|IDisposable|DisposableType|DisposableDisposer|DisposableArray|DisposableStore|DisposableMap|DisposableOne/]":
            checkProperty,
          "PropertyDefinition[readonly!=true][key.name=dispose][value.type=CallExpression][value.callee.name=/disposableArray|disposableStore|disposableMap|disposableOne/]":
            checkProperty,
        };
      },
      meta: {
        fixable: "code",
      },
    },
  },
};

export const recommended = {
  plugin,
  recommended: {
    plugins: {
      disposable: plugin,
    },
    rules: {
      "disposable/readonly-dispose": "error",
    },
  },
};

export default recommended;
