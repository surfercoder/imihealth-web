import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// react-doctor is a separate scanner that respects `// eslint-disable*` comments
// referencing its rules. We register a stub plugin here so ESLint knows the
// rule names exist (and skips them as no-ops) when those comments appear in
// source. Without this, ESLint flags `react-doctor/<rule>` as "rule not found".
const reactDoctorRuleNames = [
  "rerender-state-only-in-handlers",
  "rendering-hydration-mismatch-time",
  "react-compiler-destructure-method",
  "advanced-event-handler-refs",
  "no-fetch-in-effect",
  "no-cascading-set-state",
  "nextjs-no-use-search-params-without-suspense",
  "server-auth-actions",
  "server-after-nonblocking",
  "no-giant-component",
  "nextjs-no-side-effect-in-get-handler",
];
const reactDoctorPlugin = {
  rules: Object.fromEntries(
    reactDoctorRuleNames.map((name) => [
      name,
      { meta: { type: "problem", schema: [] }, create: () => ({}) },
    ]),
  ),
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    // Register the react-doctor stub plugin so ESLint recognizes the rule
    // names referenced in `// eslint-disable-next-line react-doctor/...`
    // comments scattered through the codebase. The stub rules never report
    // anything; the real diagnostics come from `npx react-doctor`. Disable
    // unused-directive reporting since these stubs will never trigger.
    plugins: { "react-doctor": reactDoctorPlugin },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: [
      "src/__tests__/**/*.ts",
      "src/__tests__/**/*.tsx",
      "src/__mocks__/**/*.ts",
      "src/__mocks__/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "src/components/dashboard-charts/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    rules: {
      // eslint-plugin-react v7 (bundled in eslint-config-next) uses
      // context.getFilename() which is not available in ESLint 10 flat config.
      "react/display-name": "off",
      "react/jsx-key": "off",
      "react/jsx-no-comment-textnodes": "off",
      "react/jsx-no-duplicate-props": "off",
      "react/jsx-no-target-blank": "off",
      "react/jsx-no-undef": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "off",
      "react/no-children-prop": "off",
      "react/no-danger-with-children": "off",
      "react/no-deprecated": "off",
      "react/no-direct-mutation-state": "off",
      "react/no-find-dom-node": "off",
      "react/no-is-mounted": "off",
      "react/no-render-return-value": "off",
      "react/no-string-refs": "off",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": "off",
      "react/no-unsafe": "off",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/require-render-return": "off",
    },
  },
]);

export default eslintConfig;
