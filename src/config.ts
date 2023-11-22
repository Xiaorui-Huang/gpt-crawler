import type { Page } from "playwright";

export type Config = {
  /**
   * URL to start the crawl
   * @example "https://www.builder.io/c/docs/developers"
   * @default ""
   */
  url: string;
  /**
   * Codes of languages to crawl
   */
  languageCodes: string[];
  /**
   * Selector to grab the inner text from
   * @example ".docs-builder-container"
   * @default ""
   */
  selector?: string;
  /**
   * Don't crawl more than this many pages
   * @default 50
   */
  maxPagesToCrawl: number;
  /**
   * File name for the finished data
   * @default "output.json"
   */
  outputFileName: string;
  /** Optional cookie to be set. E.g. for Cookie Consent */
  cookie?: { name: string; value: string };
  /** Optional function to run for each page found */
  onVisitPage?: (options: {
    page: Page;
    pushData: (data: any) => Promise<void>;
  }) => Promise<void>;
  /** Optional timeout for waiting for a selector to appear */
  waitForSelectorTimeout?: number;
};
