// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config } from "./config.js";
import { Page } from "playwright";

let pageCounter = 0;

export function getPageHtml(page: Page, selector = "body") {
    return page.evaluate((selector) => {
        // Check if the selector is an XPath
        if (selector.startsWith("/")) {
            const elements = document.evaluate(
                selector,
                document,
                null,
                XPathResult.ANY_TYPE,
                null
            );
            let result = elements.iterateNext();
            return result ? result.textContent || "" : "";
        } else {
            // Handle as a CSS selector
            const el = document.querySelector(selector) as HTMLElement | null;
            return el?.innerText || "";
        }
    }, selector);
}

export async function waitForXPath(page: Page, xpath: string, timeout: number) {
    await page.waitForFunction(
        (xpath) => {
            const elements = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.ANY_TYPE,
                null
            );
            return elements.iterateNext() !== null;
        },
        xpath,
        { timeout }
    );
}



export async function crawl(config: Config) {
    if (process.env.NO_CRAWL !== "true") {
        // PlaywrightCrawler crawls the web using a headless
        // browser controlled by the Playwright library.
        const crawler = new PlaywrightCrawler({
            // Use the requestHandler to process each of the crawled pages.
            headless: false,
            async requestHandler({ request, page, enqueueLinks, log, pushData }) {
                if (config.cookie) {
                    // Set the cookie for the specific URL
                    const cookie = {
                        name: config.cookie.name,
                        value: config.cookie.value,
                        url: request.loadedUrl,
                    };
                    await page.context().addCookies([cookie]);
                }
                const loadedUrl = request.loadedUrl ? request.loadedUrl : "";
                const languageCodeMatch = loadedUrl.match(/language\/(\w+)\//);
                const languageCode = languageCodeMatch ? languageCodeMatch[1] : "unknown";
                if (loadedUrl && loadedUrl.startsWith("https://login.library.utoronto.ca")) {
                    log.info(`Awaiting manual authentication at ${loadedUrl}`);

                    await page.waitForURL(config.url, { timeout: 60000 });

                    log.info("Authentication completed.");
                }

                const title = await page.title();
                pageCounter++;
                log.info(
                    `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`
                );

                // Use custom handling for XPath selector
                if (config.selector) {
                    if (config.selector.startsWith("/")) {
                        await waitForXPath(
                            page,
                            config.selector,
                            config.waitForSelectorTimeout ?? 1000
                        );
                    } else {
                        await page.waitForSelector(config.selector, {
                            timeout: config.waitForSelectorTimeout ?? 1000,
                        });
                    }
                }

                const html = await getPageHtml(page, config.selector);




                // Save results as JSON to ./storage/datasets/default
                await pushData({ title, url: request.loadedUrl, html, languageCode });

                if (config.onVisitPage) {
                    await config.onVisitPage({ page, pushData });
                }

                const languageURLs = config.languageCodes.map(code =>
                    `https://www-ethnologue-com.myaccess.library.utoronto.ca/language/${code}/`
                );

                // Enqueue all generated URLs at once
                await enqueueLinks({ urls: languageURLs });
                await page.waitForTimeout(2000); 
            },
            // Comment this option to scrape the full website.
            maxRequestsPerCrawl: config.maxPagesToCrawl,
            // Uncomment this option to see the browser window.
            // headless: false,
            maxConcurrency: 1, // Reducing concurrency
        });

        // Add first URL to the queue and start the crawl.
        await crawler.run([config.url]);
    }
}

export async function write(config: Config) {
    const jsonFiles = await glob("storage/datasets/default/*.json", {
        absolute: true,
    });

    const results = [];
    for (const file of jsonFiles) {
        const data = JSON.parse(await readFile(file, "utf-8"));
        results.push(data);
    }

    await writeFile(config.outputFileName, JSON.stringify(results, null, 2));
}
