import { defaultConfig } from "../config.js";
import { crawl, write } from "./core.js";

try {
    await crawl(defaultConfig);
} finally {
    await write(defaultConfig);
}

