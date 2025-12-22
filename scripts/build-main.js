const { build } = require("vite");
const path = require("path");
const fs = require("fs-extra");

async function buildMain() {
  try {
    // 1. Build the main process with Vite
    await build({
      configFile: path.join(__dirname, "../vite.main.config.ts"),
    });

    // 2. Copy preload.js to dist-main
    const srcPreload = path.join(__dirname, "../src/main/preload.js");
    const distPreload = path.join(__dirname, "../dist-main/preload.js");
    
    await fs.copy(srcPreload, distPreload);
    console.log("Preload script copied to dist-main");

  } catch (err) {
    console.error("Error building main process:", err);
    process.exit(1);
  }
}

buildMain();
