import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import parser from "@typescript-eslint/parser";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: {
    parser: parser,
  },
  plugins: {
    "react-hooks": reactHooks,
  },
  rules: {
    "react-hooks/rules-of-hooks": "error",
  },
});
