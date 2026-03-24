import axios from "axios";
import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import TurndownService from "turndown";
export class WebCrawlerApi {
    turndownService;
    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced"
        });
    }
    async readWebPage(args) {
        const { url, render_js = true, wait_selector, css_selector } = args;
        let dom;
        if (render_js) {
            const virtualConsole = new VirtualConsole();
            // Forward virtual console logs to terminal if needed for debugging
            // virtualConsole.sendTo(console);
            try {
                dom = await JSDOM.fromURL(url, {
                    resources: "usable",
                    runScripts: "dangerously",
                    virtualConsole,
                    pretendToBeVisual: true,
                });
                // Wait for JS to execute. JSDOM doesn't have a perfect "networkidle" 
                // so we wait for the wait_selector or a fixed timeout.
                if (wait_selector) {
                    await new Promise((resolve) => {
                        const start = Date.now();
                        const interval = setInterval(() => {
                            if (dom.window.document.querySelector(wait_selector) || Date.now() - start > 10000) {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 100);
                    });
                }
                else {
                    // Default wait for some potential async rendering
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to load page with JSDOM: ${error.message}`
                };
            }
        }
        else {
            try {
                const response = await axios.get(url);
                dom = new JSDOM(response.data, { url });
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to fetch page with Axios: ${error.message}`
                };
            }
        }
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (!article || !article.content) {
            // If readability fails, try to get raw HTML from selector or body
            let contentHtml;
            if (css_selector) {
                const el = dom.window.document.querySelector(css_selector);
                contentHtml = el ? el.innerHTML : dom.window.document.body.innerHTML;
            }
            else {
                contentHtml = dom.window.document.body.innerHTML;
            }
            if (!contentHtml) {
                return {
                    success: false,
                    message: "Failed to extract content from the page."
                };
            }
            const markdown = this.turndownService.turndown(contentHtml);
            return {
                success: true,
                url,
                title: dom.window.document.title,
                content: markdown
            };
        }
        const markdown = this.turndownService.turndown(article.content);
        return {
            success: true,
            url,
            title: article.title || dom.window.document.title,
            byline: article.byline,
            excerpt: article.excerpt,
            content: markdown
        };
    }
}
//# sourceMappingURL=web-crawler.js.map