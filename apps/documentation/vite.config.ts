import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "fumadocs-mdx/vite";
import * as sourceConfig from "./source.config";

export default defineConfig({
  plugins: [
    mdx(sourceConfig),
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
