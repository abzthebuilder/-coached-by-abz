import { readFile } from "node:fs/promises";
import path from "node:path";

/** Oswald SemiBold (SIL Open Font License, see assets/fonts/OFL.txt), for generated images. */
export async function oswald() {
  return readFile(path.join(process.cwd(), "assets/fonts/Oswald-SemiBold.woff"));
}
