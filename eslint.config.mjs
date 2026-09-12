import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // Vendored third-party tooling (.claude/skills/README.md) -- bundled
    // JS shipped as-is from an external release, never edited here, so it
    // should never surface as lint noise on this project's own code.
    ".claude/**",
  ]),
]);

export default eslintConfig;
