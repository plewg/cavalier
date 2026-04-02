import { pentible, relativeIgnoreFile } from "@pentible/eslint-config";
import { pentibleNext } from "@pentible/eslint-config-next";
import { pentibleNode } from "@pentible/eslint-config-node";
import { pentiblePrettier } from "@pentible/eslint-config-prettier";
import { pentibleReact } from "@pentible/eslint-config-react";
import { pentibleWeb } from "@pentible/eslint-config-web";
import reactQuery from "@tanstack/eslint-plugin-query";
import { defineConfig } from "eslint/config";

const config = defineConfig([
    relativeIgnoreFile(".gitignore", import.meta.url),
    {
        ignores: ["apps/web/next-env.d.ts"],
    },
    {
        settings: {
            // NOTE: required because n plugin doesn't read the root package.json
            node: { version: "^24" },
        },
    },
    pentible,
    {
        files: ["apps/web/**"],
        extends: [
            pentibleNode,
            pentibleWeb,
            pentibleReact,
            reactQuery.configs["flat/recommended"],
            pentibleNext,
        ],
        rules: {
            "jsx-a11y/alt-text": "off",
            "@next/next/no-img-element": "off",
            "jsx-a11y/click-events-have-key-events": "off",
            "jsx-a11y/no-noninteractive-element-interactions": "off",
        },
    },
    pentiblePrettier,
]);

export default config;
