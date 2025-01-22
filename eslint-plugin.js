const plugin = {
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
          "PropertyDefinition[readonly!=true][key.name=dispose][typeAnnotation.typeAnnotation.typeName.name=/Disposer|IDisposable|DisposableType|DisposableDisposer|DisposableStore|DisposableMap|DisposableOne/]":
            checkProperty,
          "PropertyDefinition[readonly!=true][key.name=dispose][value.type=CallExpression][value.callee.name=/disposableStore|disposableMap|disposableOne/]":
            checkProperty,
        };
      },
      meta: {
        fixable: "code",
      },
    },
  },
};

module.exports = {
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
