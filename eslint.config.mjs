// @ts-check
import minecraftLinting from "eslint-plugin-minecraft-linting";
import tsParser from "@typescript-eslint/parser";
import eslint from "@eslint/js";
import ts from "typescript-eslint";
import tsp from "@typescript-eslint/eslint-plugin";

export default ts.config(eslint.configs.recommended, ts.configs.recommended, ts.configs.stylistic, {
  files: ["**/*.ts"],
  languageOptions: {
    parser: tsParser,
    ecmaVersion: "latest",
  },
  plugins: {
    tsp,
    "minecraft-linting": minecraftLinting,
  },
  rules: {
    "minecraft-linting/avoid-unnecessary-command": "error",
  },
});
