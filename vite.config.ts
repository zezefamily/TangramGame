import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          geometry: ["polygon-clipping"],
          rive: ["@rive-app/canvas"],
        },
      },
    },
  },
});
