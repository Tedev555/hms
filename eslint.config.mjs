import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = [
  ...nextCoreWebVitals,
  prettierConfig,
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
