import { defineConfig } from "vite";

// The game is deployed to GitHub Pages at https://maxy618.github.io/space-game/,
// so every asset URL must carry the /space-game/ prefix.
export default defineConfig({
    base: "/space-game/",
    build: {
        target: "es2020",
    },
});
