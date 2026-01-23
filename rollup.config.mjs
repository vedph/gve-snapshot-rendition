import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import * as terserModule from "@rollup/plugin-terser"; // Optional: Minification (for production)
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import { readFileSync } from "fs";

const terser = terserModule.terser || terserModule.default || terserModule;

// Read version from package.json
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default {
  input: "src/index.ts", // Entry point for your library
  output: [
    {
      file: "dist/index.js", // Output file for ES6 modules
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/index.cjs.min.js", // Output file for CommonJS (minified)
      format: "cjs",
      sourcemap: true,
      plugins: [terser()], // Minify for production
    },
  ],
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: pkg.version,
      },
    }),
    nodeResolve(), // Resolve node_modules
    commonjs(), // Convert CommonJS modules to ES6 (for GSAP)
    typescript({
      tsconfig: "./tsconfig.json", // Use your existing tsconfig.json
      declaration: true,
      declarationDir: "./dist",
    }),
  ],
  external: [], // Add external dependencies here if needed
};
