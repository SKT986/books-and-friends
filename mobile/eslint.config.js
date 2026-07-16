// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // This flags any effect that calls a named async fetch-then-setState
      // helper (our standard "load on mount" pattern) as if it were setting
      // state synchronously, even though updates happen after an `await`.
      // Known false positive for this pattern; see react-hooks v6 issues.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
