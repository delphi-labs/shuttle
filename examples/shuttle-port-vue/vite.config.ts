import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vue from "@vitejs/plugin-vue";
import { viteCommonjs, esbuildCommonjs } from "@originjs/vite-plugin-commonjs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteCommonjs(),
    vue(),
    nodePolyfills({
      globals: {
        global: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ["@delphi-labs/shuttle", "@delphi-labs/shuttle-vue"],
    esbuildOptions: {
      plugins: [
        // Solves:
        // https://github.com/vitejs/vite/issues/5308
        // add the name of your package
        esbuildCommonjs(["cosmjs-types"]),
      ],
    },
  },
  build: {
    commonjsOptions: {
      include: [/delphi-labs\/shuttle-vue/, /delphi-labs\/shuttle/, /node_modules/],
    },
  },
});
