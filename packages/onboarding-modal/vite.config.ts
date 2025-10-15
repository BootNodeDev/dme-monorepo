import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { copyFileSync } from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: "lib",
      insertTypesEntry: true,
      tsconfigPath: "./tsconfig.lib.json",
      rollupTypes: true,
    }),
    {
      name: "copy-files",
      closeBundle: () => {
        copyFileSync("lib/index.css", "dist/index.css");
        copyFileSync("../../LICENSE", "LICENSE");
      },
    },
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "lib/index.ts"),
      name: "OnboardingModal",
      fileName: "index",
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
