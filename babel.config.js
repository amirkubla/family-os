module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Replace `import.meta` with a plain object so the production bundle
      // doesn't contain ES-module-only syntax.  Expo's web export emits a
      // classic <script defer> tag (not type="module"), and `import.meta`
      // is a SyntaxError in that context.  Zustand's devtools check
      // `import.meta.env?.MODE` — replacing with `{}` makes `.env`
      // evaluate to `undefined`, which is the safe/no-devtools path.
      [
        function ({ types: t }) {
          return {
            visitor: {
              MetaProperty(path) {
                path.replaceWith(t.objectExpression([]));
              },
            },
          };
        },
      ],
    ],
  };
};
