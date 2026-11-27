// Copies the barcode reader's WebAssembly file into /public so it's served from this site
// (not a third-party CDN). Runs automatically before every build.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = require.resolve("zxing-wasm/reader/zxing_reader.wasm");
mkdirSync("public/vendor", { recursive: true });
copyFileSync(src, "public/vendor/zxing_reader.wasm");
console.log("Copied barcode reader to public/vendor/zxing_reader.wasm");
