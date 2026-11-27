import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The art is drawn SVG (data: URIs) and painted pictures cut out in the browser; next/image cannot optimise either,
      // and the app is built with vinext, so plain <img> is the intended element.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",
  ]),
]);

export default eslintConfig;
